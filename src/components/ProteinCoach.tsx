import { MENU } from '../lib/menu'
import type { Targets } from '../lib/types'

interface Props {
  totals: { kcal: number; p: number; c: number; f: number }
  targets: Targets
}

export default function ProteinCoach({ totals, targets }: Props) {
  const pLeft = targets.p - totals.p
  const kcalLeft = targets.kcal - totals.kcal

  // Hide when protein target is met
  if (pLeft <= 0) return null

  // Rank non-sauce menu items by protein-per-kcal (descending)
  const ranked = MENU
    .filter((m) => m.meal !== 'extras' && m.p > 0)
    .map((m) => ({ ...m, ratio: m.p / m.kcal }))
    .sort((a, b) => b.ratio - a.ratio)

  // Pick items that fit remaining calories, up to 3
  const picks: typeof ranked = []
  let budgetKcal = Math.max(0, kcalLeft)
  for (const item of ranked) {
    if (picks.length >= 3) break
    if (item.kcal <= budgetKcal) {
      picks.push(item)
      budgetKcal -= item.kcal
    }
  }

  // If nothing fits the calorie budget, show top 2 by ratio anyway
  if (!picks.length) {
    picks.push(...ranked.slice(0, 2))
  }

  return (
    <div className="bg-paper2 border border-line rounded-2xl p-4 mt-4">
      <div className="font-display font-semibold text-[1rem] text-forest mb-1">
        {Math.round(pLeft)} g protein to go
      </div>
      <div className="text-[.78rem] text-inksoft mb-2.5">Cheapest from your menu:</div>
      <div className="space-y-1.5">
        {picks.map((item) => (
          <div key={item.code} className="flex items-center gap-2.5">
            <span className="font-display font-semibold text-[.68rem] text-white px-1.5 py-0.5 rounded-md bg-forest">{item.code}</span>
            <span className="flex-1 text-[.85rem] font-semibold truncate">{item.name}</span>
            <span className="text-[.72rem] text-inksoft whitespace-nowrap">{item.p}P · {item.kcal} kcal</span>
          </div>
        ))}
      </div>
    </div>
  )
}
