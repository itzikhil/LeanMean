import { useState } from 'react'
import type { Settings as S, Targets } from '../lib/types'

export default function Settings({ settings, onSave }: { settings: S; onSave: (s: S) => void }) {
  const [s, setS] = useState<S>(settings)
  const upd = (day: 'training' | 'rest', key: keyof Targets, v: string) =>
    setS({ ...s, [day]: { ...s[day], [key]: +v || 0 } })

  return (
    <div className="mt-5 space-y-5">
      <p className="text-[.85rem] text-inksoft">Two presets — the day toggle on the dashboard picks which applies. Pull calories from carbs/fat on rest days; keep protein constant.</p>
      {(['training', 'rest'] as const).map((day) => (
        <div key={day} className="bg-paper2 border border-line rounded-2xl p-4">
          <div className="font-display font-semibold text-[1.05rem] mb-3 capitalize">{day} day</div>
          <div className="grid grid-cols-5 gap-2">
            {(['kcal', 'p', 'c', 'f', 'fb'] as const).map((k) => (
              <div key={k}>
                <label className="block text-[.7rem] font-bold uppercase text-inksoft mb-1">{k === 'p' ? 'Prot' : k === 'c' ? 'Carb' : k === 'f' ? 'Fat' : k === 'fb' ? 'Fiber' : 'Kcal'}</label>
                <input type="number" inputMode="numeric" value={s[day][k]} onChange={(e) => upd(day, k, e.target.value)}
                  className="w-full text-base px-2.5 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => onSave(s)} className="w-full bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90">Save targets</button>
    </div>
  )
}
