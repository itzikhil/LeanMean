import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayTotal, StepsEntry } from '../lib/db'
import type { WeightEntry } from '../lib/types'

const r = (n: number) => Math.round(n)
const short = (d: string) => d.slice(5)

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function getRecentDates(days: number): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const value = ymd(d)
    let label: string
    if (i === 0) label = 'Today'
    else if (i === 1) label = 'Yesterday'
    else label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    result.push({ value, label })
  }
  return result
}

export default function WeeklyDashboard({
  range, weights, stepsHistory, goalKcal, goalP, stepsGoal, onLogWeight, onLogSteps,
}: {
  range: DayTotal[]
  weights: WeightEntry[]
  stepsHistory: StepsEntry[]
  goalKcal: number
  goalP: number
  stepsGoal: number
  onLogWeight: (kg: number) => void
  onLogSteps: (date: string, steps: number) => void
}) {
  const [w, setW] = useState('')
  const [stepsInput, setStepsInput] = useState('')
  const [stepsDate, setStepsDate] = useState(ymd(new Date()))
  const recentDates = getRecentDates(14)
  const last7 = range.slice(-7)
  const avg = (key: keyof DayTotal) =>
    last7.length ? Math.round(last7.reduce((s, d) => s + (d[key] as number), 0) / last7.length) : 0
  const avgKcal = avg('kcal')
  const avgP = avg('p')

  const last7Steps = stepsHistory.slice(-7)
  const avgSteps = last7Steps.length ? Math.round(last7Steps.reduce((s, d) => s + d.steps, 0) / last7Steps.length) : 0

  const wChart = weights.map((x) => ({ date: x.date, kg: x.weight_kg }))
  const wTrend = (() => {
    if (weights.length < 2) return null
    const first = weights[0].weight_kg
    const lastW = weights[weights.length - 1].weight_kg
    const days = (new Date(weights[weights.length - 1].date).getTime() - new Date(weights[0].date).getTime()) / 86400000
    if (days <= 0) return null
    return ((lastW - first) / days) * 7 // kg/week
  })()

  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="7-day avg kcal" value={`${avgKcal}`} sub={`goal ${goalKcal}`} accent={avgKcal <= goalKcal ? '#3f7a4f' : '#bb3b2e'} />
        <Stat label="7-day avg protein" value={`${avgP} g`} sub={`goal ${goalP} g`} accent={avgP >= goalP * 0.95 ? '#3f7a4f' : '#b07d1e'} />
      </div>

      <Card title="Daily calories (14 days)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={range.slice(-14)} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd0bb" vertical={false} />
            <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 10, fill: '#6b6356' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b6356' }} />
            <Tooltip formatter={(v: number) => `${r(v)} kcal`} labelFormatter={short} />
            <ReferenceLine y={goalKcal} stroke="#c0623a" strokeDasharray="4 4" />
            <Bar dataKey="kcal" fill="#2f4a3a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {wTrend !== null && weights.length >= 7 ? (
        <WeightAdvisor trend={wTrend} />
      ) : weights.length > 0 && weights.length < 7 ? (
        <Card title="Weight advisor">
          <p className="text-[.82rem] text-inksoft italic">Log a few more days ({7 - weights.length} to go) to get a recommendation.</p>
        </Card>
      ) : null}

      <Card title="Weight">
        <div className="flex gap-2 mb-3">
          <input type="number" inputMode="decimal" step="0.1" value={w} onChange={(e) => setW(e.target.value)} placeholder="Today's weight (kg)"
            className="flex-1 text-base px-3 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
          <button onClick={() => { const v = parseFloat(w); if (v) { onLogWeight(v); setW('') } }}
            className="bg-forest text-white font-bold px-4 rounded-[10px] active:opacity-90">Log</button>
        </div>
        {wTrend !== null && (
          <p className="text-[.82rem] text-inksoft mb-2">
            Trend: <b className={wTrend <= 0 ? 'text-lunch' : 'text-terra'}>{wTrend > 0 ? '+' : ''}{wTrend.toFixed(2)} kg/week</b> (weekly average)
          </p>
        )}
        {wChart.length >= 2 ? (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={wChart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd0bb" vertical={false} />
              <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 10, fill: '#6b6356' }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: '#6b6356' }} />
              <Tooltip formatter={(v: number) => `${v} kg`} labelFormatter={short} />
              <Line type="monotone" dataKey="kg" stroke="#c0623a" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-inksoft italic text-sm py-4">Log a few days to see your trend.</p>
        )}
      </Card>

      <Card title="Steps">
        <div className="flex gap-2 mb-3">
          <select
            value={stepsDate}
            onChange={(e) => setStepsDate(e.target.value)}
            className="text-sm px-2 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra"
          >
            {recentDates.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input type="number" inputMode="numeric" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} placeholder="Steps"
            className="flex-1 text-base px-3 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
          <button onClick={() => { const v = parseInt(stepsInput); if (v > 0) { onLogSteps(stepsDate, v); setStepsInput('') } }}
            className="bg-forest text-white font-bold px-4 rounded-[10px] active:opacity-90">Log</button>
        </div>
        {stepsHistory.length >= 7 && (
          <p className="text-[.82rem] text-inksoft mb-2">
            7-day avg: <b className={avgSteps >= stepsGoal ? 'text-lunch' : 'text-terra'}>{avgSteps.toLocaleString()}</b> steps (goal: {stepsGoal.toLocaleString()})
          </p>
        )}
        {stepsHistory.length >= 2 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={stepsHistory.slice(-14)} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd0bb" vertical={false} />
              <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 10, fill: '#6b6356' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b6356' }} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} steps`} labelFormatter={short} />
              <ReferenceLine y={stepsGoal} stroke="#3f7a4f" strokeDasharray="4 4" />
              <Bar dataKey="steps" fill="#b8506e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-inksoft italic text-sm py-4">Log a few days to see your trend.</p>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="bg-paper2 border border-line rounded-2xl p-4">
      <div className="text-[.7rem] font-bold uppercase tracking-wide text-inksoft">{label}</div>
      <div className="font-display font-black text-2xl mt-1" style={{ color: accent }}>{value}</div>
      <div className="text-[.7rem] text-inksoft mt-0.5">{sub}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper2 border border-line rounded-2xl p-4">
      <div className="font-display font-semibold text-[1.05rem] mb-2">{title}</div>
      {children}
    </div>
  )
}

function WeightAdvisor({ trend }: { trend: number }) {
  const loss = -trend // positive means losing weight
  let color: string
  let title: string
  let message: string

  if (loss < 0.3) {
    color = '#b07d1e'
    title = 'Loss is slow'
    message = 'Consider dropping ~150–200 kcal (one carb portion).'
  } else if (loss <= 0.6) {
    color = '#3f7a4f'
    title = 'On target'
    message = 'Hold steady — you\'re in the sweet spot.'
  } else {
    color = '#bb3b2e'
    title = 'Too fast'
    message = 'Risking muscle loss. Add a carb portion back.'
  }

  return (
    <div className="bg-paper2 border border-line rounded-2xl p-4">
      <div className="font-display font-semibold text-[1.05rem] mb-1">Weight advisor</div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="font-display font-semibold text-[.95rem]" style={{ color }}>{title}</span>
        <span className="text-[.78rem] text-inksoft ml-auto">{loss.toFixed(2)} kg/wk loss</span>
      </div>
      <p className="text-[.82rem] text-inksoft">{message}</p>
      <p className="text-[.72rem] text-inksoft/70 mt-1.5 italic">Pull calories from carbs/fat, never protein.</p>
    </div>
  )
}
