# Brave Search API Integration Design

**Date:** 2026-02-15
**Status:** Approved
**Approach:** Dedicated Search Service Layer

## Context

RocketMap's AI agents need real-world data to validate startup assumptions. Currently, market sizing (TAM/SAM/SOM), competitive analysis, and consistency checking rely solely on the AI's training data, which can be outdated or lack specificity for niche markets.

This integration adds web search capability via Brave Search API to enable:
- AI-powered market research with current data sources
- Competitor discovery and validation
- Cross-referencing user claims against web sources
- Industry report and market size validation

**Key Constraints:**
- Free tier: 2,000 API calls/month (~65/day)
- Must cache aggressively to survive free tier limits
- Graceful degradation when rate limited (don't block user experience)
- Hybrid triggering: automatic for critical validations, on-demand for research

## Architecture Overview

**Three-Layer Design:**

1. **Service Layer** (`lib/ai/brave-search.ts`)
   - Core search function with caching and rate limiting
   - In-memory LRU cache (24-hour TTL, 100 entry max)
   - Rate limit tracking via API response headers
   - Graceful error handling

2. **Tool Layer** (`lib/ai/tools.ts`)
   - `searchWeb` tool for AI SDK integration
   - Calls service layer, returns structured results
   - Never throws - always returns a response

3. **Agent Integration** (`lib/ai/agents.ts`, `lib/ai/prompts.ts`)
   - Deep-dive modules: `tam_sam_som`, `market_validation`, `competitive_landscape`
   - System-level consistency checker
   - Updated prompts to guide AI on when to search

**Data Flow:**
```
AI Agent → searchWeb tool → BraveSearchService → Brave API
                                ↓ (cache hit)
                            Cache Layer ← (return cached)
```

## Component Details

### BraveSearchService (`lib/ai/brave-search.ts`)

**Main Function:**
```typescript
searchBrave(query: string, options?: SearchOptions): Promise<SearchResult>

interface SearchOptions {
  maxResults?: number;  // Default: 5
  freshness?: string;   // Optional: "24h", "week", "month"
}

interface SearchResult {
  results: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  query: string;
  cached: boolean;
  error?: string;
}
```

**SearchCache Class:**
- Map-based LRU cache
- Key: SHA-256 hash of normalized query (lowercase, trimmed)
- Value: `{ data: SearchResult, timestamp: number }`
- Max 100 entries, evicts oldest when full
- 24-hour TTL (reasonable for market data freshness)
- Methods: `get()`, `set()`, `has()`, `evictExpired()`

**RateLimiter Class:**
- Tracks: `remainingCalls: number`, `resetTime: Date | null`
- Updates from `X-RateLimit-Remaining` response header
- `canMakeRequest(): boolean` - Check before API call
- `recordRequest(headers: Headers)` - Update counters
- `getStatus()` - Return current usage for monitoring

**Error Handling:**
- Rate limit (429): Return cached data if available, else empty results with message
- API errors (5xx, network): Return empty results with graceful message
- Invalid API key: Throw clear error at initialization (fail fast)
- Cache errors: Log and continue without caching
- Never crash - AI agents always get a response

### searchWeb Tool (`lib/ai/tools.ts`)

```typescript
export const searchWeb = tool({
  description: 'Search the web for current market research data, industry reports, competitor information, or market validation. Use when you need real-world data beyond training knowledge.',
  inputSchema: z.object({
    query: z.string().describe('Search query optimized for market research'),
    maxResults: z.number().optional().default(5).describe('Number of results to return (1-10)'),
  }),
  execute: async ({ query, maxResults }) => {
    const result = await searchBrave(query, { maxResults });
    return result; // Always returns, never throws
  },
});
```

**Added to tool registry:**
- Registered in `allTools` object
- Available via `getToolsForAgent(['searchWeb', ...])`

## Integration Points

### Agent Configuration (`lib/ai/agents.ts`)

**Modified `getAgentConfig()` to add `searchWeb` tool for:**
- Deep-dive agents (when `agentType` matches deep-dive modules)
- General agent (consistency checker)

```typescript
if (agentType === 'tam_sam_som' ||
    agentType === 'market_validation' ||
    agentType === 'competitive_landscape' ||
    agentType === 'general') {
  toolNames.push('searchWeb');
}
```

### Prompt Updates (`lib/ai/prompts.ts`)

**Updated `DEEP_DIVE_PROMPTS` for:**
- `tam_sam_som`: "Use searchWeb to find industry reports, market research firms, and current market size data"
- `market_validation`: "Use searchWeb to cross-reference TAM/SAM/SOM estimates with published reports"
- `competitive_landscape`: "Use searchWeb to discover competitors, funding rounds, and market positioning"

**Updated `BASE_SYSTEM_PROMPT`:**
- Added guidance: "When you need current market data, industry reports, or competitor information, use the searchWeb tool"
- Optimization tip: "Prefer broad queries over multiple narrow ones to conserve API calls"

## Environment Configuration

**Add to `.env.example`:**
```bash
# Brave Search API
# Get your API key from: https://brave.com/search/api/
# Free tier: 2,000 calls/month
BRAVE_SEARCH_API_KEY=
```

**Validation:**
- Service throws clear error if `BRAVE_SEARCH_API_KEY` is missing
- Error message includes link to get API key

## Verification & Testing

### Manual Testing Steps

1. **Setup:**
   - Add `BRAVE_SEARCH_API_KEY` to `.env.local`
   - Restart dev server

2. **Test Deep-Dive Search:**
   - Open canvas with Customer Segments block
   - Navigate to Market Research → TAM/SAM/SOM
   - Click "Estimate with AI"
   - Verify: AI mentions searching for market data, returns specific sources

3. **Test Cache:**
   - Repeat same TAM estimation with same inputs
   - Check logs: Second request should show `cached: true`
   - Response should be instant

4. **Test Rate Limit Handling:**
   - Temporarily set invalid API key
   - Trigger TAM estimation
   - Verify: AI completes analysis with graceful message "Search unavailable"

5. **Test Consistency Checker:**
   - Fill multiple canvas blocks
   - Click "Run Consistency Check"
   - Verify: AI can validate claims by searching (e.g., "TAM estimate validated against Gartner report")

### API Endpoints to Verify

- `POST /api/canvas/[canvasId]/blocks/[blockType]/deep-dive`
  - Module: `tam_sam_som` - Uses search for market sizing
  - Module: `competitive_landscape` - Uses search for competitor discovery
  - Module: `market_validation` - Uses search for claim validation

- `POST /api/canvas/[canvasId]/chat`
  - Consistency checker uses search for cross-validation

### Success Criteria

- ✅ AI finds real market data with source citations (URLs)
- ✅ Competitive landscape returns actual company names
- ✅ Cache reduces redundant API calls (>50% cache hit rate after initial queries)
- ✅ Graceful degradation when rate limited (no crashes, user sees notice)
- ✅ No unhandled errors in any scenario

### Monitoring & Logging

**Log each search with:**
```typescript
console.log(`[BraveSearch] Query: "${query}" | Cached: ${cached} | Remaining: ${rateLimiter.getStatus().remainingCalls}`);
```

**Track metrics:**
- Cache hit rate: `cacheHits / totalSearches`
- API calls per day: Monitor against 65/day average
- Alert when `remainingCalls < 100`

## Implementation Checklist

### Phase 1: Service Layer
- [ ] Create `lib/ai/brave-search.ts`
- [ ] Implement `SearchCache` class
- [ ] Implement `RateLimiter` class
- [ ] Implement `searchBrave()` function
- [ ] Add error handling and logging
- [ ] Add environment variable validation

### Phase 2: Tool Integration
- [ ] Add `searchWeb` tool to `lib/ai/tools.ts`
- [ ] Register in tool registry
- [ ] Test tool in isolation

### Phase 3: Agent Integration
- [ ] Update `lib/ai/agents.ts` to add tool to agents
- [ ] Update `lib/ai/prompts.ts` with search guidance
- [ ] Test with deep-dive modules
- [ ] Test with consistency checker

### Phase 4: Configuration & Documentation
- [ ] Add `BRAVE_SEARCH_API_KEY` to `.env.example`
- [ ] Update CLAUDE.md with search capability notes
- [ ] Test end-to-end with real API key

### Phase 5: Verification
- [ ] Manual testing (all scenarios above)
- [ ] Verify cache behavior
- [ ] Verify rate limit handling
- [ ] Verify graceful degradation

## Future Enhancements

**If free tier becomes limiting:**
- Upgrade to Base/Pro tier (20-50 QPS)
- Add Redis cache (persistent across server restarts)
- Implement query optimization (deduplicate similar queries)

**If more search providers needed:**
- Abstract search interface: `SearchProvider` interface
- Support multiple providers: Brave, Google Custom Search, Bing
- Fallback chain: Try Brave → Google → Bing

**Advanced features:**
- Search result ranking/filtering based on source quality
- Extract structured data from search results (market sizes, dates, etc.)
- User-facing search history/citations in UI

## References

- [Brave Search API Documentation](https://brave.com/search/api/)
- [Brave API Authentication Guide](https://api-dashboard.search.brave.com/documentation/guides/authentication)
- [Brave API Rate Limiting](https://api-dashboard.search.brave.com/documentation/guides/rate-limiting)
- [RocketMap AI Architecture](../CLAUDE.md)
