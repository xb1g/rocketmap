# AI Active Indicator & Token Usage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement active visual indicators for AI working states, and hover tooltips showing token usage for assistant messages.

**Architecture:** Use backend Promise.all to fetch AI usage, persist it, parse it on load in ChatBar/BlockChatSection, and render in ChatMessage via CSS-based hover tooltips. Add active CSS indicators in header and border glows.

**Tech Stack:** React 19, tailwindcss v4, Vercel AI SDK, Appwrite.

---

### Task 1: Add Unit Tests for Token Usage Rendering

**Files:**
- Modify: `tests/components/ai/ChatMessage.test.tsx`

**Step 1: Write the failing tests**

Add these tests to `tests/components/ai/ChatMessage.test.tsx`:
```tsx
test('ChatMessage renders token usage tooltip when usage data is provided', () => {
  const usage = { promptTokens: 150, completionTokens: 80, totalTokens: 230 };
  render(<ChatMessage role="assistant" content="Hello" usage={usage} />)
  const questionMark = screen.getByText('?')
  expect(questionMark).toBeInTheDocument()
})

test('ChatMessageWithParts renders token usage tooltip in controls row', () => {
  const usage = { promptTokens: 200, completionTokens: 100, totalTokens: 300 };
  render(
    <ChatMessageWithParts
      messageId="msg-usage-id"
      role="assistant"
      parts={[{ type: 'text', text: 'Ok' }]}
      usage={usage}
      acceptedEdits={new Set()}
      rejectedEdits={new Set()}
      acceptedSegments={new Set()}
      rejectedSegments={new Set()}
      acceptedItems={new Set()}
      rejectedItems={new Set()}
    />
  )
  expect(screen.getByText('?')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/components/ai/ChatMessage.test.tsx`
Expected: FAIL (types do not accept `usage` yet, or element not found)

**Step 3: Commit**

```bash
git add tests/components/ai/ChatMessage.test.tsx
git commit -m "test: add token usage rendering test cases to ChatMessage"
```

---

### Task 2: Implement Backend Token Persisting

**Files:**
- Modify: `app/api/canvas/[canvasId]/chat/route.ts`
- Modify: `app/api/canvas/[canvasId]/blocks/[blockType]/chat/route.ts`

**Step 1: Update chat route to store usage**

Replace `Promise.resolve(result.steps)` with `Promise.all([result.steps, result.usage])` in `app/api/canvas/[canvasId]/chat/route.ts`:
```typescript
    // Save assistant response (text + tool results with args) after stream completes
    Promise.all([result.steps, result.usage]).then(([steps, usage]) => {
      const parts: Array<Record<string, unknown>> = [];
      for (const step of steps) {
        if (step.text) parts.push({ type: 'text', text: step.text });
        const argsMap = new Map<string, unknown>();
        for (const tc of step.toolCalls) {
          const call = tc as unknown as { toolCallId: string; args: unknown };
          argsMap.set(call.toolCallId, call.args);
        }
        for (const tc of step.toolResults) {
          const tr = tc as unknown as { toolName: string; toolCallId: string; result: unknown };
          parts.push({
            type: 'tool-result',
            toolName: tr.toolName,
            toolCallId: tr.toolCallId,
            args: argsMap.get(tr.toolCallId) ?? {},
            result: tr.result,
          });
        }
      }
      if (parts.length > 0) {
        saveChatMessage(canvasId, chatKey || 'general', user.$id, {
          messageId: `assistant-${Date.now()}`,
          role: 'assistant',
          content: JSON.stringify({
            parts,
            usage: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            }
          }),
        }).catch((err) => console.error('[chat-persist] Failed to save assistant message:', err));
      }
    }).catch(() => {});
```

**Step 2: Update block chat route to store usage**

Make the same change to `app/api/canvas/[canvasId]/blocks/[blockType]/chat/route.ts` using `Promise.all([result.steps, result.usage])`.

**Step 3: Commit**

```bash
git add app/api/canvas/[canvasId]/chat/route.ts app/api/canvas/[canvasId]/blocks/[blockType]/chat/route.ts
git commit -m "feat: persist stream token usage in assistant chat message payloads"
```

---

### Task 3: Load and Parse Usage in Client

**Files:**
- Modify: `app/components/ai/ChatBar.tsx`
- Modify: `app/components/ai/BlockChatSection.tsx`
- Modify: `app/components/ai/ChatMessages.tsx`

**Step 1: Parse usage in toUIMessages inside ChatBar.tsx**

Update `toUIMessages` in `app/components/ai/ChatBar.tsx`:
```typescript
          return {
            id: m.id,
            role: m.role as UIMessage['role'],
            parts: uiParts,
            createdAt: new Date(m.createdAt),
            usage: parsed.usage, // extract persisted usage
          };
```

**Step 2: Parse usage in toUIMessages inside BlockChatSection.tsx**

Make the same change to `toUIMessages` inside `app/components/ai/BlockChatSection.tsx`.

**Step 3: Forward usage in ChatMessages.tsx**

Update `ChatMessages.tsx` to forward the `usage` property to `ChatMessageWithParts`:
```tsx
        <ChatMessageWithParts
          key={m.id}
          messageId={m.id}
          role={m.role as "user" | "assistant"}
          parts={visibleParts}
          usage={m.usage} // Added!
```

**Step 4: Commit**

```bash
git add app/components/ai/ChatBar.tsx app/components/ai/BlockChatSection.tsx app/components/ai/ChatMessages.tsx
git commit -m "feat: parse and forward message token usage in chat panels"
```

---

### Task 4: Implement Token Usage Hover Tooltip in ChatMessage

**Files:**
- Modify: `app/components/ai/ChatMessage.tsx`

**Step 1: Update interfaces & components**

Add `usage` to `ChatMessageProps` and `ChatMessageWithPartsProps` interfaces.
Add rendering code for the hover tooltip trigger `?` in `ChatMessage` and `ChatMessageWithParts`.

In `ChatMessage`:
```tsx
        {!isUser && usage && (
          <div className="relative group/tooltip flex items-center justify-end self-end ml-auto mt-0.5">
            <span className="cursor-help text-[9px] text-foreground-muted/30 hover:text-foreground-muted/70 flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/5 hover:bg-white/5 transition-all">
              ?
            </span>
            <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover/tooltip:block bg-slate-950/95 border border-white/10 text-[9px] text-foreground-muted/80 rounded-lg p-2 whitespace-nowrap shadow-xl z-50 pointer-events-none min-w-[110px]">
              <div className="font-semibold text-foreground/90 border-b border-white/10 pb-0.5 mb-1 text-[10px]">Token Usage</div>
              <div className="flex justify-between gap-3"><span>Prompt:</span><span className="font-mono text-foreground">{usage.promptTokens.toLocaleString()}</span></div>
              <div className="flex justify-between gap-3"><span>Completion:</span><span className="font-mono text-foreground">{usage.completionTokens.toLocaleString()}</span></div>
              <div className="mt-1 pt-1 border-t border-white/10 flex justify-between gap-3 font-semibold">
                <span>Total:</span>
                <span className="font-mono text-[var(--chroma-indigo)]">{(usage.totalTokens ?? (usage.promptTokens + usage.completionTokens)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
```

In `ChatMessageWithParts`, inside the assistant controls container:
```tsx
        {!isUser && (onRegenerate || usage) && (
          <div className="flex items-center justify-between w-full mt-0.5 gap-2">
            {onRegenerate ? (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-md text-foreground-muted/30 hover:text-foreground-muted/70 hover:bg-white/5 transition-all"
                aria-label="Regenerate response"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <polyline points="23 20 23 14 17 14" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Regenerate
              </button>
            ) : (
              <div />
            )}
            
            {usage && (
              <div className="relative group/tooltip flex items-center">
                <span 
                  className="cursor-help text-[9px] text-foreground-muted/30 hover:text-foreground-muted/70 flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/5 hover:bg-white/5 transition-all"
                  title="Show tokens"
                >
                  ?
                </span>
                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover/tooltip:block bg-slate-950/95 border border-white/10 text-[9px] text-foreground-muted/80 rounded-lg p-2 whitespace-nowrap shadow-xl z-50 pointer-events-none min-w-[110px]">
                  <div className="font-semibold text-foreground/90 border-b border-white/10 pb-0.5 mb-1 text-[10px]">Token Usage</div>
                  <div className="flex justify-between gap-3"><span>Prompt:</span><span className="font-mono text-foreground">{usage.promptTokens.toLocaleString()}</span></div>
                  <div className="flex justify-between gap-3"><span>Completion:</span><span className="font-mono text-foreground">{usage.completionTokens.toLocaleString()}</span></div>
                  <div className="mt-1 pt-1 border-t border-white/10 flex justify-between gap-3 font-semibold">
                    <span>Total:</span>
                    <span className="font-mono text-[var(--chroma-indigo)]">{(usage.totalTokens ?? (usage.promptTokens + usage.completionTokens)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
```

**Step 2: Run tests to verify they pass**

Run: `bunx vitest run tests/components/ai/ChatMessage.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add app/components/ai/ChatMessage.tsx
git commit -m "feat: render hover token usage tooltip on assistant messages"
```

---

### Task 5: Implement AI Working Visual Cues

**Files:**
- Modify: `app/components/ai/ChatBar.tsx`
- Modify: `app/globals.css`

**Step 1: Add ai-active class to ChatBar.tsx and add glowing dot in header**

Update `<aside className="chat-dock glass-morphism">` in `ChatBar.tsx` to:
```tsx
<aside className={`chat-dock glass-morphism ${isLoading ? "ai-active" : ""}`}>
```
And inside the header, next to the "AI Copilot" title, add:
```tsx
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] uppercase tracking-wider text-foreground-muted/55">AI Copilot</div>
            {isLoading && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
          </div>
```

**Step 2: Add ai-active styling to app/globals.css**

Add CSS definitions for `.chat-dock.ai-active`:
```css
.chat-dock.ai-active {
  border-color: rgba(129, 140, 248, 0.35) !important;
  box-shadow:
    0 28px 56px rgba(0, 0, 0, 0.44),
    0 12px 26px rgba(0, 0, 0, 0.28),
    0 0 20px rgba(129, 140, 248, 0.1) !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
```

**Step 3: Commit**

```bash
git add app/components/ai/ChatBar.tsx app/globals.css
git commit -m "style: add glowing working state cues to chat dock"
```

---

### Task 6: Run Final Verification

**Files:**
- None

**Step 1: Run full vitest suite**

Run: `bunx vitest run`
Expected: PASS (All 15 tests pass)
