/**
 * Shared parsing + normalization for the Gemini food endpoints
 * (parse-meal, parse-plate).
 *
 * The model is prompted for a strict shape, but the prompt is not a guarantee —
 * everything it returns is untrusted and must pass through `normalizeItems`
 * before it reaches the client. In particular a weight ("138 grams") has a
 * habit of leaking into `qty`, which then multiplies the whole day's totals.
 */

export const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealId = (typeof MEAL_IDS)[number]

/** Meal slots that existed in older builds and may still come back from the model. */
const LEGACY_MEALS: Record<string, MealId> = { prewo: 'snack', extras: 'snack' }

/**
 * Above this, `qty` is a parser artifact rather than a real serving count —
 * almost always a gram weight that leaked out of the name.
 */
const MAX_QTY = 20

/** Sanity ceiling per item, so one bad row can't swamp a day's totals. */
const MAX_KCAL = 5000
const MAX_MACRO = 1000

export interface ParsedItem {
  name: string
  kcal: number
  p: number
  c: number
  f: number
  fb: number
  qty: number
  meal: MealId
  estimated: boolean
}

/** Strip markdown fences and any text before the first [/{ or after the last ]/}. */
export function extractJson(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.search(/[\[{]/)
  const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'))
  if (start >= 0 && end >= start) s = s.slice(start, end + 1)
  return s
}

/**
 * Extract an array from a potentially object-wrapped response.
 * Handles cases where the model returns {items: [...]} or {foods: [...]} instead of [...].
 */
export function unwrapArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>
    // Check common wrapper keys
    for (const key of ['items', 'foods', 'results', 'data', 'entries']) {
      if (Array.isArray(obj[key])) return obj[key]
    }
    // Check if there's any array property
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val
    }
  }
  return null
}

/** Coerce to a finite, non-negative number, capped and rounded. */
function num(v: unknown, max: number, decimals: number): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return 0
  const capped = Math.min(n, max)
  const factor = 10 ** decimals
  return Math.round(capped * factor) / factor
}

/**
 * `qty` means SERVINGS, never grams.
 *
 * A value over MAX_QTY is the "138 grams -> qty:138" failure mode: the macros
 * that came with it may be per-100g, per-gram, or already correct, and there is
 * no reliable way to tell which. Falling back to 1 is the only safe reading now
 * that the prompt demands pre-scaled totals — and the confirm step shows qty, so
 * a wrong guess is visible and correctable before anything is logged.
 */
function normQty(v: unknown, name: string, fn: string): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return 1
  if (n > MAX_QTY) {
    console.warn(`[${fn}] implausible qty ${n} for "${name}" — coercing to 1`)
    return 1
  }
  return Math.max(0.5, Math.round(n * 2) / 2)
}

/** Whitelist the meal slot; unknown or legacy values fall back to snack. */
function normMeal(v: unknown): MealId {
  const s = String(v ?? '').toLowerCase().trim()
  if ((MEAL_IDS as readonly string[]).includes(s)) return s as MealId
  return LEGACY_MEALS[s] ?? 'snack'
}

function normName(v: unknown): string {
  const s = String(v ?? '').trim().slice(0, 120)
  return s || 'Food'
}

/**
 * Coerce a raw model response into well-formed items.
 * Non-object entries are dropped; everything else is clamped into range.
 */
export function normalizeItems(raw: unknown, fn: string): ParsedItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object' && !Array.isArray(it))
    .map((it) => {
      const name = normName(it.name)
      return {
        name,
        kcal: num(it.kcal, MAX_KCAL, 0),
        p: num(it.p, MAX_MACRO, 1),
        c: num(it.c, MAX_MACRO, 1),
        f: num(it.f, MAX_MACRO, 1),
        fb: num(it.fb, MAX_MACRO, 1),
        qty: normQty(it.qty, name, fn),
        meal: normMeal(it.meal),
        estimated: it.estimated !== false,
      }
    })
}
