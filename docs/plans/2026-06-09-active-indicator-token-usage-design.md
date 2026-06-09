# Design Document: AI Activity Indicator & Token Usage Hover Details

## Overview
This document specifies the design for:
1. Adding a premium visual cue when the AI copilot is working (loading/streaming/tool calling).
2. Displaying token usage details (Prompt, Completion, Total) via a hover `?` tooltip on assistant messages.

## Requirements
- **Visual Activity Indicators:**
  - Add a pulsing cyan-purple active dot to the AI Copilot header in the chat sidebar.
  - Apply an active glowing holographic border to the chat dock (`.chat-dock.ai-active`) and block chat input container when the AI is working.
- **Token Usage Hover Details:**
  - Track and store stream token usage on the server-side inside the persisted message payload (`content: JSON.stringify({ parts, usage })`).
  - Retrieve and parse token usage on the client-side (`toUIMessages()`).
  - Display a clean hover `?` button with a detailed tooltip showing Prompt, Completion, and Total tokens on each assistant message.

## Proposed Design

### 1. API Changes (Token Persisting)
In both [chat/route.ts](file:///Users/bunyasit/dev/rocketmap/app/api/canvas/[canvasId]/chat/route.ts) and [block chat route.ts](file:///Users/bunyasit/dev/rocketmap/app/api/canvas/[canvasId]/blocks/[blockType]/chat/route.ts):
- Switch from `Promise.resolve(result.steps)` to `Promise.all([result.steps, result.usage])`.
- Retrieve usage data (`promptTokens`, `completionTokens`, `totalTokens`).
- Store the usage data inside the persisted Appwrite message payload:
```typescript
JSON.stringify({
  parts,
  usage: {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  }
})
```

### 2. Client Parsing
In `toUIMessages()` inside both [ChatBar.tsx](file:///Users/bunyasit/dev/rocketmap/app/components/ai/ChatBar.tsx) and [BlockChatSection.tsx](file:///Users/bunyasit/dev/rocketmap/app/components/ai/BlockChatSection.tsx):
- Parse and set the `usage` property on the returned `UIMessage`:
```typescript
usage: parsed.usage
```

### 3. Visual working indicators
In [ChatBar.tsx](file:///Users/bunyasit/dev/rocketmap/app/components/ai/ChatBar.tsx):
- Pass `isLoading` class `.ai-active` to the `chat-dock` element:
```tsx
<aside className={`chat-dock glass-morphism ${isLoading ? "ai-active" : ""}`}>
```
- Render a pulsing cyan glow dot in the header next to "AI Copilot" when loading.

In [app/globals.css](file:///Users/bunyasit/dev/rocketmap/app/globals.css):
- Define `.chat-dock.ai-active` border and box-shadow styles to match the "holographic" AI style.

### 4. Hover Tooltip Component
In [ChatMessage.tsx](file:///Users/bunyasit/dev/rocketmap/app/components/ai/ChatMessage.tsx):
- Update `ChatMessageProps` and `ChatMessageWithPartsProps` to receive `usage`.
- Add a hoverable `?` info button next to the controls or assistant bubble that opens a tooltip showing:
  - Prompt tokens
  - Completion tokens
  - Total tokens (using the custom color theme)
