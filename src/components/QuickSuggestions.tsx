import { useEffect, useState } from 'react'
import { getTimeSuggestions, type Suggestion } from '../lib/db'
import type { MealId } from '../lib/types'

type TimeWindow = 'morning' | 'midday' | 'evening'

function currentWindow(): TimeWindow {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 16) return 'midday'
  return 'evening'
}

const WINDOW_LABEL: Record<TimeWindow, string> = {
  morning: 'Morning favourites',
  midday: 'Midday favourites',
  evening: 'Evening favourites',
}

export default function QuickSuggestions({ onAdd }: {
  onAdd: (entry: { meal: MealId; name: string; kcal: number; p: number; c: number; f: number; fb: number; qty: number }) => void
}) {
  const [items, setItems] = useState<Suggestion[]>([])
  const [window] = useState(currentWindow)

  useEffect(() => {
    getTimeSuggestions(window).then(setItems).catch(() => {})
  }, [window])

  if (!items.length) return null

  return (
    <div className="mt-3 mb-1">
      <p className="text-[.68rem] font-bold uppercase tracking-widest text-terra/70 mb-1.5 ml-0.5">{WINDOW_LABEL[window]}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((s) => (
          <button key={s.name} onClick={() => onAdd({ meal: s.meal, name: s.name, kcal: s.kcal, p: s.p, c: s.c, f: s.f, fb: s.fb ?? 0, qty: 1 })}
            className="flex-shrink-0 bg-paper2 border border-line rounded-xl px-3 py-2 text-left active:bg-white min-w-[130px] max-w-[170px]">
            <span className="block font-semibold text-[.8rem] truncate">{s.name}</span>
            <span className="block text-[.62rem] text-inksoft">{s.kcal} kcal · {s.p}P</span>
          </button>
        ))}
      </div>
    </div>
  )
}
