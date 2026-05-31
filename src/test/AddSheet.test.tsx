/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddSheet from '../components/AddSheet'

vi.mock('../components/BarcodeScanner', () => ({ default: () => null }))

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onAdd: vi.fn(),
  myFoods: [],
  onSaveMyFood: vi.fn(),
  onDeleteMyFood: vi.fn(),
  savedMeals: [],
  onDeleteSavedMeal: vi.fn(),
  onAddSavedMeal: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('AddSheet – Staples tab', () => {
  it('serving staple (egg): shows pending UI with servings input, uses selected qty and meal', async () => {
    const user = userEvent.setup()
    render(<AddSheet {...baseProps} />)

    await user.click(screen.getByRole('button', { name: 'Staples' }))
    await user.click(screen.getByRole('button', { name: /Whole egg/i }))

    // Pending UI visible
    expect(screen.getByText('Whole egg')).toBeInTheDocument()
    expect(screen.getByText(/Servings/i)).toBeInTheDocument()
    expect(screen.queryByText(/Grams eaten/i)).not.toBeInTheDocument()

    // Set servings to 2
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '2')

    // Pick Dinner
    await user.click(screen.getByRole('button', { name: 'Dinner' }))

    await user.click(screen.getByRole('button', { name: 'Add to log' }))

    expect(baseProps.onAdd).toHaveBeenCalledWith({
      meal: 'dinner',
      name: 'Whole egg',
      kcal: 72,
      p: 6.3,
      c: 0.4,
      f: 4.8,
      qty: 2,
    })
  })

  it('100g staple (chicken breast): grams input scales macros correctly', async () => {
    const user = userEvent.setup()
    render(<AddSheet {...baseProps} />)

    await user.click(screen.getByRole('button', { name: 'Staples' }))
    await user.click(screen.getByRole('button', { name: /Chicken breast \(raw\)/i }))

    // Pending UI shows grams input, not servings
    expect(screen.getByText(/Grams eaten/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Servings$/i)).not.toBeInTheDocument()

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '150')

    await user.click(screen.getByRole('button', { name: 'Add to log' }))

    // 150g of chicken breast (raw): 120 kcal/100g → 180 kcal, 23g P → 34.5g, 0g C → 0g, 2.6g F → 3.9g
    expect(baseProps.onAdd).toHaveBeenCalledWith({
      meal: 'snack',
      name: 'Chicken breast (raw) (150g)',
      kcal: 180,
      p: 34.5,
      c: 0,
      f: 3.9,
      qty: 1,
    })
  })
})
