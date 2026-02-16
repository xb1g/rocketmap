import { render, screen } from '@testing-library/react'
import { CanvasTabs } from '@/app/components/canvas/CanvasTabs'

test('renders assumptions tab', () => {
  render(<CanvasTabs activeTab="canvas" onTabChange={() => {}} />)
  expect(screen.getByText(/assumptions/i)).toBeInTheDocument()
})
