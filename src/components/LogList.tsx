import { useState } from 'react'
import { MEALS } from '../lib/menu'
import type { LogEntry, MealId, SavedMealItem } from '../lib/types'

const r = (n: number) => Math.round(n)

export default function LogList({
  entries, onQty, onDelete, onCopyMeal, onCopyDay, onSaveMeal,
}: {
  entries: LogEntry[]
  onQty: (id: string, delta: number) => void
  onDelete: (id: string) => void
  onCopyMeal: (meal: MealId, fromDate: string) => void
  onCopyDay: (fromDate: string) => void
  onSaveMeal: (name: string, items: SavedMealItem[]) => void
}) {
  const [copyOpen, setCopyOpen] = useState<MealId | 'day' | null>(null)
  const [copyDays, setCopyDays] = useState(1)
  const [savingMeal, setSavingMeal] = useState<MealId | null>(null)
  const [saveName, setSaveName] = useState('')

  function doCopy(meal?: MealId) {
    const d = new Date()
    d.setDate(d.getDate() - copyDays)
    const from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    if (meal) onCopyMeal(meal, from)
    else onCopyDay(from)
    setCopyOpen(null)
    setCopyDays(1)
  }

  if (!entries.length) {
    return (
      <div className="py-12">
        <p className="text-center text-inksoft italic text-[.92rem]">
          No food logged yet.<br />Tap "Add food" to start your day.
        </p>
        <button onClick={() => setCopyOpen('day')} className="block mx-auto mt-3 text-terra font-bold text-[.85rem]">
          Copy from a previous day
        </button>
        {copyOpen === 'day' && (
          <CopyPicker label="entire day" days={copyDays} onDays={setCopyDays} onConfirm={() => doCopy()} onCancel={() => setCopyOpen(null)} />
        )}
      </div>
    )
  }
  return (
    <div className="mt-6">
      <div className="flex justify-end mb-2">
        <button onClick={() => setCopyOpen('day')} className="text-[.74rem] font-bold text-terra active:opacity-70">
          Copy full day...
        </button>
      </div>
      {copyOpen === 'day' && (
        <CopyPicker label="entire day" days={copyDays} onDays={setCopyDays} onConfirm={() => doCopy()} onCancel={() => setCopyOpen(null)} />
      )}
      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.id)
        if (!items.length) return null
        const mk = items.reduce((s, e) => s + e.kcal * e.qty, 0)
        return (
          <div key={m.id} className="mb-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
              <h3 className="font-display font-semibold text-[1.05rem]">{m.name}</h3>
              <button onClick={() => setCopyOpen(copyOpen === m.id ? null : m.id)}
                className="text-[.68rem] font-bold text-terra/70 active:text-terra ml-1">copy...</button>
              <button onClick={() => { setSavingMeal(savingMeal === m.id ? null : m.id); setSaveName('') }}
                className="text-[.68rem] font-bold text-forest/70 active:text-forest">save...</button>
              <span className="ml-auto text-[.78rem] font-bold text-inksoft">{r(mk)} kcal</span>
            </div>
            {copyOpen === m.id && (
              <CopyPicker label={m.name} days={copyDays} onDays={setCopyDays} onConfirm={() => doCopy(m.id)} onCancel={() => setCopyOpen(null)} />
            )}
            {savingMeal === m.id && (
              <div className="bg-white border border-line rounded-xl px-3 py-2.5 mb-2">
                <p className="text-[.78rem] text-inksoft mb-2">Save <b>{m.name}</b> items as a reusable meal:</p>
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Meal name"
                  className="w-full text-base px-3 py-2 border border-line rounded-lg bg-white focus:outline-none focus:border-terra mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!saveName.trim()) return
                      onSaveMeal(saveName.trim(), items.map((e) => ({ name: e.name, kcal: e.kcal, p: e.p, c: e.c, f: e.f, qty: e.qty })))
                      setSavingMeal(null)
                      setSaveName('')
                    }}
                    disabled={!saveName.trim()}
                    className="flex-1 bg-forest text-white font-bold py-2 rounded-lg text-[.82rem] active:opacity-90 disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button onClick={() => setSavingMeal(null)} className="flex-1 bg-paper border border-line text-inksoft font-bold py-2 rounded-lg text-[.82rem] active:opacity-90">Cancel</button>
                </div>
              </div>
            )}
            {items.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[.95rem] truncate">{e.name}</div>
                  <div className="text-[.7rem] text-inksoft mt-0.5">
                    <span className="mr-2.5">{r(e.kcal * e.qty)} kcal</span>
                    <span className="mr-2.5 text-macp">{r(e.p * e.qty)}P</span>
                    <span className="mr-2.5 text-macc">{r(e.c * e.qty)}C</span>
                    <span className="text-macf">{r(e.f * e.qty)}F</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onQty(e.id, -0.5)} className="w-[26px] h-[26px] rounded-full border border-line bg-white text-forest text-base leading-none active:bg-paper">{'\u2212'}</button>
                  <span className="font-bold text-[.82rem] min-w-[30px] text-center">{'\u00d7'}{e.qty}</span>
                  <button onClick={() => onQty(e.id, 0.5)} className="w-[26px] h-[26px] rounded-full border border-line bg-white text-forest text-base leading-none active:bg-paper">{'\uff0b'}</button>
                </div>
                <button onClick={() => onDelete(e.id)} className="text-macp/50 active:text-macp text-[1.05rem] px-1">{'\u2715'}</button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function CopyPicker({ label, days, onDays, onConfirm, onCancel }: {
  label: string
  days: number
  onDays: (d: number) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const dayLabel = days === 1 ? 'yesterday' : days + ' days ago'
  return (
    <div className="bg-white border border-line rounded-xl px-3 py-2.5 mb-2">
      <p className="text-[.78rem] text-inksoft mb-2">Copy <b>{label}</b> from:</p>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => onDays(Math.max(1, days - 1))}
          className="w-[28px] h-[28px] rounded-full border border-line bg-paper text-forest text-base leading-none active:bg-white">{'\u2212'}</button>
        <span className="font-bold text-[.85rem] min-w-[100px] text-center">{dayLabel}</span>
        <button onClick={() => onDays(days + 1)}
          className="w-[28px] h-[28px] rounded-full border border-line bg-paper text-forest text-base leading-none active:bg-white">+</button>
      </div>
      <div className="flex gap-2">
        <button onClick={onConfirm} className="flex-1 bg-forest text-white font-bold py-2 rounded-lg text-[.82rem] active:opacity-90">Copy</button>
        <button onClick={onCancel} className="flex-1 bg-paper border border-line text-inksoft font-bold py-2 rounded-lg text-[.82rem] active:opacity-90">Cancel</button>
      </div>
    </div>
  )
}
