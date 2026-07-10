import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { CanvasTabs } from '@/app/components/canvas/CanvasTabs'

test('renders market, JTBD, and assumptions tabs', () => {
  render(
    <CanvasTabs
      activeTab="canvas"
      onTabChange={() => {}}
      canvasId="test-canvas"
      allBlocksFilled={false}
      viabilityData={null}
      onExplainViability={() => {}}
    />
  )
  expect(screen.getByText(/market/i)).toBeInTheDocument()
  expect(screen.getByText('JTBD')).toBeInTheDocument()
  expect(screen.getByText(/assumptions/i)).toBeInTheDocument()
})
