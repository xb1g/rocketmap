# Chat Table Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable correct rendering of Markdown tables within the AI chat sidebar.

**Architecture:** Install `remark-gfm` to parse GitHub Flavored Markdown (including tables) in `react-markdown` inside `ChatMessage.tsx`, and add accompanying clean, dark-themed styling inside `app/globals.css`.

**Tech Stack:** React 19, react-markdown 10, remark-gfm 4, Tailwind CSS, Vanilla CSS

---

### Task 1: Install remark-gfm

**Files:**
- Modify: `package.json`

**Step 1: Install remark-gfm package**

Run: `npm install remark-gfm@4`
Expected: Installation completes successfully and `remark-gfm` v4 is added to `dependencies` in `package.json`.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install remark-gfm@4 for markdown table parsing"
```

---

### Task 2: Create unit tests for ChatMessage rendering

**Files:**
- Create: `tests/components/ai/ChatMessage.test.tsx`

**Step 1: Write the failing test**

Create `tests/components/ai/ChatMessage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@/app/components/ai/ChatMessage'
import { describe, test, expect } from 'vitest'

describe('ChatMessage Table Rendering', () => {
  test('renders markdown tables as HTML tables', () => {
    const tableMarkdown = `
| Dimension | Detail |
| :--- | :--- |
| Value Prop | Live BMC engine |
| Backend | Appwrite |
    `;
    render(<ChatMessage role="assistant" content={tableMarkdown} />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Dimension')).toBeInTheDocument()
    expect(screen.getByText('Value Prop')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/ai/ChatMessage.test.tsx`
Expected: FAIL (either due to missing table structure or missing `remark-gfm` import/parsing)

**Step 3: Commit**

```bash
git add tests/components/ai/ChatMessage.test.tsx
git commit -m "test: add unit test for chat message table rendering"
```

---

### Task 3: Implement table rendering inside ChatMessage

**Files:**
- Modify: `app/components/ai/ChatMessage.tsx`

**Step 1: Update ChatMessage to import and use remark-gfm**

Modify `app/components/ai/ChatMessage.tsx` to import `remarkGfm` and pass it to all instances of `ReactMarkdown`.

```tsx
// At imports:
import remarkGfm from "remark-gfm";

// Inside ChatMessage:
<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>

// Inside ChatMessageWithParts:
<ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run tests/components/ai/ChatMessage.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add app/components/ai/ChatMessage.tsx
git commit -m "feat: integrate remark-gfm into ChatMessage react-markdown rendering"
```

---

### Task 4: Add CSS styles for markdown tables

**Files:**
- Modify: `app/globals.css`

**Step 1: Add table styles to app/globals.css**

Modify `app/globals.css` to add the minimalist dark table styling under `.chat-markdown`.

```css
/* Table styling for Chat Markdown */
.chat-markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.chat-markdown th {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.375rem 0.5rem;
  font-weight: 600;
  text-align: left;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(255, 255, 255, 0.02);
}

.chat-markdown td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0.375rem 0.5rem;
  color: rgba(255, 255, 255, 0.7);
}

.chat-markdown tr:hover {
  background-color: rgba(255, 255, 255, 0.02);
}
```

**Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: add minimalist dark table styles in chat-markdown"
```

---

### Task 5: Run full test verification

**Files:**
- None

**Step 1: Run vitest run to verify the suite**

Run: `npx vitest run tests/components/ai/ChatMessage.test.tsx`
Expected: PASS
