import { render, screen } from '@testing-library/react'
import { ChatMessage, ChatMessageWithParts } from '@/app/components/ai/ChatMessage'
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

  test('ChatMessageWithParts renders markdown tables inside text parts', () => {
    const parts = [
      {
        type: 'text',
        text: `
| Dimension | Detail |
| :--- | :--- |
| Value Prop | Live BMC engine |
| Backend | Appwrite |
        `
      }
    ];
    
    render(
      <ChatMessageWithParts
        messageId="test-msg-id"
        role="assistant"
        parts={parts}
        onAcceptEdit={() => {}}
        onRejectEdit={() => {}}
        onRevertEdit={() => {}}
        onAcceptSegment={() => {}}
        onRejectSegment={() => {}}
        onAcceptItem={() => {}}
        onRejectItem={() => {}}
        onEditMessage={() => {}}
        onRegenerate={() => {}}
        acceptedEdits={new Set()}
        rejectedEdits={new Set()}
        acceptedSegments={new Set()}
        rejectedSegments={new Set()}
        acceptedItems={new Set()}
        rejectedItems={new Set()}
        canvasSlug="test-slug"
      />
    )
    
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Dimension')).toBeInTheDocument()
    expect(screen.getByText('Value Prop')).toBeInTheDocument()
  })
})

