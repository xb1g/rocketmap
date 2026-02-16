# Guided Canvas Creation Fix - Design Document

**Date**: 2026-02-15
**Status**: Approved
**Author**: Claude Code

## Problem Statement

The guided canvas creation flow has three critical issues:

1. **Duplicate canvases**: AI can call `generateCanvas` twice in one conversation, creating duplicate canvases
2. **Poor data structure**: Creates basic text blocks instead of extracting structured segments and atomic blocks
3. **User experience**: After chat, user must manually refresh to see the canvas, no redirection

## Goals

1. Prevent duplicate canvas creation
2. Extract customer segments as structured records during creation
3. Create atomic blocks (multiple blocks per type) instead of comma-separated text
4. Ensure all code uses Appwrite relationships correctly (no legacy integer ID patterns)

## Solution Overview

### Architecture

```
User → Guided Chat (3+ messages)
  ↓
AI calls enhanced generateCanvas (once)
  ↓
Tool creates:
  ├─ Canvas document
  ├─ Segment documents (1-3 customer segments)
  └─ Block documents (N blocks, multiple per type)
  ↓
Returns { slug, canvasId, title }
  ↓
Frontend redirects to /canvas/{slug}
```

### Key Design Decisions

**1. Segments as Foundation**

Customer segments are the most important entity. They define WHO the business serves, and everything else (value props, channels, revenue) should be segment-specific.

- Segments are created as structured records in the `segments` collection
- Each segment has: name, description, demographics, psychographics, behavioral, geographic, estimatedSize
- Blocks can link to segments via Appwrite's Many-to-Many relationship

**2. Atomic Blocks**

Instead of one block per type with comma-separated text:

```
❌ OLD: One "channels" block
   contentJson: {"bmc": "Website, D2C, Social media", "lean": "..."}

✅ NEW: Three "channels" blocks
   Block 1: contentJson: {"bmc": "Website", "lean": "Website"}
   Block 2: contentJson: {"bmc": "D2C sales", "lean": "D2C"}
   Block 3: contentJson: {"bmc": "Social media", "lean": "Social"}
```

**Why?**
- Each block can be independently linked to specific segments
- Cleaner data model - each entity is discrete
- Better UI - can display as cards/chips
- Easier to edit/delete individual items

**3. No Cards Collection**

The `cards` collection has been removed. Blocks are already atomic entities - no need for an additional layer.

**4. Appwrite Relationships**

All foreign keys use Appwrite's native relationship system:
- `blocks.canvas` → relationship to canvases
- `segments.canvas` → relationship to canvases
- `blocks.segments` → Many-to-Many relationship (auto-handled by Appwrite)

No manual integer IDs or junction tables needed.

## Tool Schema Design

### Input Schema

```typescript
{
  title: string,

  // Primary: Customer segments
  segments: [{
    name: string,
    description: string,
    demographics: string,
    psychographics: string,
    behavioral: string,
    geographic: string,
    estimatedSize: string,
    priority: 'high' | 'medium' | 'low'
  }],

  // Blocks as arrays (optional)
  key_partnerships?: string[],
  key_activities?: string[],
  key_resources?: string[],
  value_prop?: string[],
  customer_relationships?: string[],
  channels?: string[],
  cost_structure?: string[],
  revenue_streams?: string[]
  // No customer_segments array - derived from segments
}
```

### Example AI Output

```json
{
  "title": "Urban Farming SaaS",
  "segments": [
    {
      "name": "Bangkok Rooftop Farmers",
      "description": "Individual condo owners with rooftop access",
      "demographics": "Age 30-50, income 50k-150k THB/mo",
      "psychographics": "Sustainability-minded, health-conscious",
      "behavioral": "Active on social media, DIY enthusiasts",
      "geographic": "Bangkok metropolitan area",
      "estimatedSize": "~2,500 potential customers",
      "priority": "high"
    }
  ],
  "channels": [
    "Website with e-commerce",
    "D2C sales via Line",
    "Social media marketing (IG, FB)"
  ],
  "revenue_streams": [
    "$15/month subscription",
    "$99 annual license"
  ],
  "key_activities": [
    "Product development",
    "Customer support",
    "Content marketing"
  ]
}
```

## Implementation Details

### Route Changes

**File**: `app/api/canvas/guided-create/route.ts`

```typescript
// Change from:
stopWhen: stepCountIs(2),

// To:
stopWhen: stepCountIs(1),
```

This ensures only one tool call per conversation.

### Tool Execution Flow

**File**: `lib/ai/tools.ts` → `createGenerateCanvasTool()`

1. **Create canvas** with Appwrite relationship to user
2. **Create segments** with relationship to canvas
3. **Create blocks** (multiple per type) with relationship to canvas
4. **Return** `{ slug, canvasId: canvas.$id, title }`

Key points:
- Use `canvas: canvas.$id` for relationship fields
- Use `users: userId` for user relationship
- Each string in block arrays becomes a separate document
- No manual linking needed - Appwrite handles it

### Prompt Updates

**File**: `lib/ai/prompts.ts`

Add guidance to `ONBOARDING_SYSTEM_PROMPT`:
- Extract 1-3 customer segments with full details
- List discrete items for each block type (not comma-separated)
- Be specific and actionable

## Trade-offs Considered

### Option A: Enhanced All-in-One Tool ✅ (Chosen)

**Pros:**
- Single atomic operation
- Zero duplication risk
- Simpler for AI (one structured output)
- All relationships established immediately

**Cons:**
- Larger tool schema
- AI must extract everything upfront

### Option B: Multi-Tool Creation ❌ (Rejected)

**Pros:**
- Modular, reusable tools
- Flexible (can skip steps)

**Cons:**
- Requires 3+ tool calls
- Race conditions
- Complex state management
- Higher duplication risk

### Option C: Two-Phase Creation ❌ (Rejected)

**Pros:**
- Backward compatible
- Separates concerns

**Cons:**
- Still needs coordination
- Duplication risk
- Slower UX
- Unclear completion state

## Success Metrics

- ✅ Only one canvas created per conversation
- ✅ 1-3 segments created with full structured data
- ✅ Multiple atomic blocks per type (average 2-5 blocks per type)
- ✅ No console errors or failed requests
- ✅ Successful redirection to canvas after creation
- ✅ All data uses Appwrite relationships (no integer IDs)

## Future Enhancements

1. **Automatic segment linking**: When creating blocks, AI could suggest which segments each block serves (e.g., "Website channel serves Bangkok Rooftop Farmers")
2. **Validation**: Cross-reference TAM estimates with segment counts
3. **Streaming**: Use `streamText` instead of single response for better UX
4. **Edit mode**: Allow refining canvas after initial creation without duplicating
