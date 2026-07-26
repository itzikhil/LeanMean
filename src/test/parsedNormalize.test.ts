import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeItems } from '../../api/_parsed'

/** Minimal well-formed item; individual tests override the field under test. */
const base = { name: 'Chicken breast', kcal: 166, p: 32, c: 0, f: 3.6, fb: 0, qty: 1, meal: 'lunch', estimated: false }

afterEach(() => vi.restoreAllMocks())

describe('normalizeItems – qty', () => {
  it('coerces a gram weight that leaked into qty back to 1', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const [item] = normalizeItems([{ ...base, name: 'Chicken breast (138g)', qty: 138 }], 'parse-meal')
    expect(item.qty).toBe(1)
    // Macros pass through untouched — only the multiplier was wrong.
    expect(item.kcal).toBe(166)
  })

  it('keeps genuine countable repeats', () => {
    expect(normalizeItems([{ ...base, name: 'Whole egg', qty: 3 }], 'parse-meal')[0].qty).toBe(3)
  })

  it('snaps to 0.5 steps and floors at 0.5', () => {
    expect(normalizeItems([{ ...base, qty: 2.3 }], 'parse-meal')[0].qty).toBe(2.5)
    expect(normalizeItems([{ ...base, qty: 0.1 }], 'parse-meal')[0].qty).toBe(0.5)
  })

  it('defaults missing, zero, negative and non-numeric qty to 1', () => {
    for (const qty of [undefined, 0, -4, 'two', null, NaN]) {
      expect(normalizeItems([{ ...base, qty }], 'parse-meal')[0].qty).toBe(1)
    }
  })
})

describe('normalizeItems – meal', () => {
  it('passes through the four valid slots', () => {
    for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
      expect(normalizeItems([{ ...base, meal }], 'parse-meal')[0].meal).toBe(meal)
    }
  })

  it('maps retired prewo/extras slots to snack', () => {
    expect(normalizeItems([{ ...base, meal: 'prewo' }], 'parse-meal')[0].meal).toBe('snack')
    expect(normalizeItems([{ ...base, meal: 'extras' }], 'parse-meal')[0].meal).toBe('snack')
  })

  it('falls back to snack for unknown, missing or wrongly-cased values', () => {
    expect(normalizeItems([{ ...base, meal: 'brunch' }], 'parse-meal')[0].meal).toBe('snack')
    expect(normalizeItems([{ ...base, meal: undefined }], 'parse-meal')[0].meal).toBe('snack')
    expect(normalizeItems([{ ...base, meal: 'Dinner' }], 'parse-meal')[0].meal).toBe('dinner')
  })
})

describe('normalizeItems – macros and shape', () => {
  it('clamps negatives and non-finite macros to 0', () => {
    const [item] = normalizeItems([{ ...base, kcal: -50, p: NaN, c: 'abc', f: Infinity }], 'parse-meal')
    expect([item.kcal, item.p, item.c, item.f]).toEqual([0, 0, 0, 0])
  })

  it('rounds kcal to whole numbers and macros to one decimal', () => {
    const [item] = normalizeItems([{ ...base, kcal: 166.7, p: 32.44 }], 'parse-meal')
    expect(item.kcal).toBe(167)
    expect(item.p).toBe(32.4)
  })

  it('drops non-object entries and never returns a non-array', () => {
    expect(normalizeItems([base, null, 'junk', 42, []], 'parse-meal')).toHaveLength(1)
    expect(normalizeItems(null, 'parse-meal')).toEqual([])
    expect(normalizeItems({ items: [base] }, 'parse-meal')).toEqual([])
  })

  it('falls back to a usable name and defaults estimated to true', () => {
    const [item] = normalizeItems([{ kcal: 100 }], 'parse-meal')
    expect(item.name).toBe('Food')
    expect(item.estimated).toBe(true)
  })
})
