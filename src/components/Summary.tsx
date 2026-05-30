import type { DayType, Targets } from '../lib/types'

interface Totals { kcal: number; p: number; c: number; f: number }

const r = (n: number) => Math.round(n)

function MacroBar({ label, val, goal, fill }: { label: string; val: number; goal: number; fill: string }) {
  const pct = Math.min(100, (val / goal) * 100)
  const left = goal - val
  return (
    <div>
      <div className="flex justify-between text-[.72rem] font-bold mb-1.5">
        <span className="uppercase opacity-85">{label}</span>
        <span>{Math.round((val / goal) * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-md bg-paper/20 overflow-hidden">
        <div className="h-full rounded-md transition-all duration-500" style={{ width: pct + '%', background: fill }} />
      </div>
      <div className="text-[.68rem] opacity-70 mt-1 text-center">{r(val)} / {goal} g</div>
      <div className="text-[.72rem] font-bold mt-0.5 text-center">
        {left >= 0 ? `${r(left)} g left` : <span className="text-[#ffb4a8]">{r(-left)} g over</span>}
      </div>
    </div>
  )
}

export default function Summary({
  totals, targets, dayType, onToggleDay,
}: {
  totals: Totals; targets: Targets; dayType: DayType; onToggleDay: () => void
}) {
  const left = targets.kcal - totals.kcal
  const calPct = Math.min(100, (totals.kcal / targets.kcal) * 100)
  return (
    <div className="bg-forest text-paper rounded-[18px] p-5 shadow-[0_14px_30px_-18px_rgba(47,74,58,.7)]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-[.8rem] font-semibold opacity-70 uppercase tracking-wider mb-1">kcal left</div>
          <div className="font-display font-black text-[2.9rem] leading-none">{r(left)}</div>
        </div>
        <div className="text-right">
          <button
            onClick={onToggleDay}
            className="text-[.72rem] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border border-paper/30 active:bg-paper/10"
          >
            {dayType === 'training' ? '🏋 Training day' : '😴 Rest day'}
          </button>
          <div className="text-[.8rem] opacity-85 mt-2">
            <b className="font-display">{r(totals.kcal)}</b> eaten<br />
            <b className="font-display">{targets.kcal}</b> goal
          </div>
        </div>
      </div>
      <div className="h-[7px] rounded-md bg-paper/20 overflow-hidden mb-4">
        <div className="h-full rounded-md transition-all duration-500"
          style={{ width: calPct + '%', background: totals.kcal > targets.kcal ? '#bb3b2e' : '#b88a2e' }} />
      </div>
      <div className="grid grid-cols-3 gap-3.5">
        <MacroBar label="Protein" val={totals.p} goal={targets.p} fill="#e98aa0" />
        <MacroBar label="Carbs" val={totals.c} goal={targets.c} fill="#e7c46a" />
        <MacroBar label="Fat" val={totals.f} goal={targets.f} fill="#7fb8b3" />
      </div>
    </div>
  )
}
