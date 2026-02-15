# Plan: Server-Side Canvas Creation via generateCanvas Tool

## Problem

The `generateCanvas` tool currently has a two-step Rube Goldberg flow:

1. **Server:** AI calls `generateCanvas` tool → `execute: async (params) => params` (just echoes args back)
2. **Client:** `AIGuidedModal` watches for the tool invocation in message parts, extracts args
3. **Client:** Sends a **second** HTTP request to `POST /api/canvas/create-with-blocks` with the extracted data
4. **Client:** Handles the response (slug, redirect)

### Why this is fragile

- The client-side tool detection (`tool-invocation` part matching) is unreliable — different AI SDK versions send parts differently (`tool-invocation`, `dynamic-tool`, `tool-*`)
- If the user closes the modal before the client detects the tool result, the canvas is never created despite the AI having "decided" to create it
- The tool's `execute` does nothing — it's a structured output extractor pretending to be a tool
- Two network round-trips (AI stream + create API) instead of one
- Session management must track `canvasSlug` separately because it only exists after the second call

## Solution

Move canvas creation into the tool's `execute` function on the server. When the AI calls `generateCanvas`, the tool itself creates the canvas in Appwrite and returns `{ slug, canvasId }`. The client then just reads the result.

## Appwrite Schema (current)

### `canvases` table
| Column | Type | Required |
|--------|------|----------|
| id | integer | yes |
| title | string(256) | yes |
| slug | varchar(256) | yes |
| description | string(1000) | no (default: '') |
| createdAt | datetime | yes |
| updatedAt | datetime | yes |
| isPublic | boolean | yes |
| ownerId | varchar(36) | yes |

### `blocks` table
| Column | Type | Required |
|--------|------|----------|
| id | integer | yes |
| canvasId | integer | yes |
| blockType | enum | yes |
| contentJson | longtext | no |
| aiAnalysisJson | string(1000) | no |
| confidenceScore | double(0-1) | no |
| riskScore | double(0-1) | no |
| deepDiveJson | longtext | no |

**blockType enum values:** `customer_segments`, `value_prop`, `channels`, `customer_relationships`, `revenue_streams`, `key_resources`, `key_activities`, `key_partnerships`, `cost_structure`, `problem`, `solution`, `key_metrics`, `unfair_advantage`

## Implementation

### 1. Make `generateCanvas` tool accept a `userId` context

The tool's `execute` needs the authenticated user's ID to set `ownerId`. AI SDK tools receive an `options` parameter — we can pass user context via `toolCallOptions` or by wrapping the tool at call time.

**Approach:** Create the tool dynamically in the route handler so it closes over `user.$id`.

### 2. Update `generateCanvas` tool execute function

**File:** `lib/ai/tools.ts`

Change `generateCanvas` from a static export to a factory function:

```ts
export function createGenerateCanvasTool(userId: string) {
  return tool({
    description: '...same...',
    inputSchema: z.object({ ...same... }),
    execute: async (params) => {
      const slug = await generateSlug(params.title, userId);
      const now = new Date().toISOString();
      const canvasIntId = Date.now();

      // Create canvas doc
      await serverDatabases.createDocument(
        DATABASE_ID, CANVASES_COLLECTION_ID, ID.unique(),
        { id: canvasIntId, title: params.title.trim(), slug, description: '', createdAt: now, updatedAt: now, isPublic: false, ownerId: userId },
      );

      // Create 9 block docs in parallel
      const ALL_BLOCK_TYPES = [
        'key_partnerships', 'key_activities', 'key_resources',
        'value_prop', 'customer_relationships', 'channels',
        'customer_segments', 'cost_structure', 'revenue_streams',
      ];
      await Promise.all(
        ALL_BLOCK_TYPES.map((blockType, i) => {
          const content = params[blockType] ?? '';
          return serverDatabases.createDocument(
            DATABASE_ID, BLOCKS_COLLECTION_ID, ID.unique(),
            { id: canvasIntId * 100 + i + 1, canvasId: canvasIntId, blockType, contentJson: JSON.stringify({ bmc: content, lean: content }) },
          );
        }),
      );

      // Return slug + id so client can redirect
      return { slug, canvasId: canvasIntId, title: params.title };
    },
  });
}
```

### 3. Update `getToolsForAgent` to support dynamic tools

**File:** `lib/ai/tools.ts`

Add an optional `overrides` parameter:

```ts
export function getToolsForAgent(toolNames: string[], overrides?: Record<string, ReturnType<typeof tool<any, any>>>) {
  const result = {};
  for (const name of toolNames) {
    result[name] = overrides?.[name] ?? allTools[name];
  }
  return result;
}
```

### 4. Update guided-create route

**File:** `app/api/canvas/guided-create/route.ts`

```ts
const tools = getToolsForAgent(['generateCanvas'], {
  generateCanvas: createGenerateCanvasTool(user.$id),
});
```

Remove the static `generateCanvas` from `allTools` (or keep it as fallback).

### 5. Update client — simplify tool detection

**File:** `app/components/dashboard/AIGuidedModal.tsx`

The `useEffect` that watches for `generateCanvas` tool completion now reads `result.slug` instead of `args.title + args.customer_segments`:

```ts
// Old: data = inv.args (the block content)
// New: data = inv.result (contains { slug, canvasId, title })

if (inv.state === 'result' && inv.result?.slug) {
  creatingRef.current = true;
  handleCanvasReady(inv.result.slug, inv.result.title);
  return;
}
```

The `handleCreateCanvas` function that calls `/api/canvas/create-with-blocks` is **deleted**. Replace with a simpler `handleCanvasReady(slug, title)` that just shows the animation and redirects.

### 6. Update GenerateCanvasCard to show slug from result

**File:** `app/components/ai/ChatMessage.tsx`

The card already reads `result` — it will now contain `{ slug, canvasId, title }` instead of echoed args. Update to show the slug and link directly from the tool result, without needing `canvasSlug` prop from the parent.

### 7. Deprecate `/api/canvas/create-with-blocks`

Keep it for now (other code may use it) but it's no longer called by the guided flow.

## File Changes Summary

| File | Change |
|------|--------|
| `lib/ai/tools.ts` | Add `createGenerateCanvasTool(userId)` factory, update `getToolsForAgent` to accept overrides |
| `app/api/canvas/guided-create/route.ts` | Use `createGenerateCanvasTool(user.$id)` instead of static tool |
| `app/components/dashboard/AIGuidedModal.tsx` | Remove `handleCreateCanvas` + `/api/canvas/create-with-blocks` call, read slug from tool result |
| `app/components/ai/ChatMessage.tsx` | Update `GenerateCanvasCard` to read slug from tool result directly |

## Migration Safety

- The existing `create-with-blocks` endpoint is untouched — no breaking changes
- The tool's `inputSchema` is identical — AI prompts don't change
- The only difference is `execute` now does real work and returns `{ slug, canvasId, title }` instead of echoing params

## Edge Cases

- **Duplicate canvas on retry:** If the AI calls the tool, canvas gets created, but the stream fails before the client sees the result → user retries → duplicate canvas. Mitigation: use a deterministic ID based on conversation ID, or check for recent canvases with same title+owner before creating.
- **Tool execution timeout:** Canvas creation involves 10 Appwrite writes (1 canvas + 9 blocks). Should complete in <2s. If it fails, the tool returns an error and the AI can retry or inform the user.
