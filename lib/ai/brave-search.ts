import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  cached: boolean;
  remainingCalls?: number;
}

interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
  ttl: number;
}

interface BraveSearchOptions {
  maxResults?: number;
}

// ─── SearchCache Class ───────────────────────────────────────────────────────

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries = 100;
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  private hashQuery(query: string): string {
    const normalized = this.normalizeQuery(query);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  has(query: string): boolean {
    const key = this.hashQuery(query);
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  get(query: string): SearchResponse | null {
    const key = this.hashQuery(query);
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(query: string, data: SearchResponse): void {
    const key = this.hashQuery(query);

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.defaultTTL,
    });
  }

  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    return evicted;
  }

  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

// ─── RateLimiter Class ───────────────────────────────────────────────────────

class RateLimiter {
  private remainingCalls: number;
  private resetTime: number;
  private readonly monthlyLimit = 2000;

  constructor() {
    // Initialize with free tier limit
    this.remainingCalls = this.monthlyLimit;
    // Reset at start of next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    this.resetTime = nextMonth.getTime();
  }

  canMakeRequest(): boolean {
    // Check if we've hit the limit
    if (this.remainingCalls <= 0) {
      // Check if limit has reset
      if (Date.now() >= this.resetTime) {
        this.remainingCalls = this.monthlyLimit;
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        this.resetTime = nextMonth.getTime();
        return true;
      }
      return false;
    }
    return true;
  }

  recordRequest(remainingFromHeader?: number): void {
    if (remainingFromHeader !== undefined) {
      // Update from server response header
      this.remainingCalls = remainingFromHeader;
    } else {
      // Decrement local counter
      this.remainingCalls = Math.max(0, this.remainingCalls - 1);
    }
  }

  getStatus(): { remainingCalls: number; resetTime: number } {
    return {
      remainingCalls: this.remainingCalls,
      resetTime: this.resetTime,
    };
  }
}

// ─── Module State ────────────────────────────────────────────────────────────

const cache = new SearchCache();
const rateLimiter = new RateLimiter();

// Evict expired cache entries every hour
setInterval(() => {
  const evicted = cache.evictExpired();
  if (evicted > 0) {
    console.log(`[BraveSearch] Evicted ${evicted} expired cache entries`);
  }
}, 60 * 60 * 1000);

// ─── Main Search Function ────────────────────────────────────────────────────

export async function searchBrave(
  query: string,
  options: BraveSearchOptions = {}
): Promise<SearchResponse> {
  const { maxResults = 5 } = options;

  // Check cache first
  if (cache.has(query)) {
    const cached = cache.get(query);
    if (cached) {
      console.log(`[BraveSearch] Cache hit for query: "${query}"`);
      return { ...cached, cached: true };
    }
  }

  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const status = rateLimiter.getStatus();
    console.warn(
      `[BraveSearch] Rate limit exceeded. Resets at ${new Date(status.resetTime).toISOString()}`
    );
    return {
      query,
      results: [],
      cached: false,
      remainingCalls: 0,
    };
  }

  // Check API key
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.error('[BraveSearch] BRAVE_SEARCH_API_KEY not configured');
    return {
      query,
      results: [],
      cached: false,
    };
  }

  try {
    // Call Brave API
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', maxResults.toString());

    console.log(`[BraveSearch] Fetching query: "${query}" (max ${maxResults} results)`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json',
      },
    });

    // Update rate limit from headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining) {
      rateLimiter.recordRequest(parseInt(remaining, 10));
    } else {
      rateLimiter.recordRequest();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[BraveSearch] API error: ${response.status} ${response.statusText}`,
        errorText
      );
      return {
        query,
        results: [],
        cached: false,
        remainingCalls: rateLimiter.getStatus().remainingCalls,
      };
    }

    const data = await response.json();

    // Extract web results
    const results: SearchResult[] = (data.web?.results || [])
      .slice(0, maxResults)
      .map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        description: item.description || '',
      }));

    const searchResponse: SearchResponse = {
      query,
      results,
      cached: false,
      remainingCalls: rateLimiter.getStatus().remainingCalls,
    };

    // Cache successful result
    cache.set(query, searchResponse);

    const status = rateLimiter.getStatus();
    console.log(
      `[BraveSearch] Success: ${results.length} results, ${status.remainingCalls} calls remaining`
    );

    return searchResponse;
  } catch (error) {
    console.error('[BraveSearch] Request failed:', error);
    return {
      query,
      results: [],
      cached: false,
      remainingCalls: rateLimiter.getStatus().remainingCalls,
    };
  }
}

// ─── Cache Stats Export ──────────────────────────────────────────────────────

export function getCacheStats() {
  return cache.getStats();
}

export function getRateLimitStatus() {
  return rateLimiter.getStatus();
}
