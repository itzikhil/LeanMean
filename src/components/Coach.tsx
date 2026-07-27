import { useEffect, useMemo, useRef, useState } from 'react'
import { MENU } from '../lib/menu'
import { STAPLES } from '../lib/staples'
import type { LogEntry, MyFood, Targets, WeightEntry } from '../lib/types'
import type { DayTotal } from '../lib/db'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface Props {
  totals: { kcal: number; p: number; c: number; f: number; fb: number }
  targets: Targets
  dayType: 'training' | 'rest'
  weights: WeightEntry[]
  myFoods: MyFood[]
  range: DayTotal[]
  todayEntries: LogEntry[]
}

export default function Coach({ totals, targets, dayType, weights, myFoods, range, todayEntries }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showInput, setShowInput] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const remaining = useMemo(() => ({
    kcal: targets.kcal - totals.kcal,
    p: targets.p - totals.p,
    c: targets.c - totals.c,
    f: targets.f - totals.f,
    fb: targets.fb - totals.fb,
  }), [totals, targets])

  const context = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    const timeLabel = hour < 10 ? 'early morning' : hour < 12 ? 'late morning' : hour < 14 ? 'midday' : hour < 17 ? 'afternoon' : hour < 20 ? 'evening' : 'late evening'
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const pctKcal = targets.kcal > 0 ? Math.round((totals.kcal / targets.kcal) * 100) : 0
    const pctP = targets.p > 0 ? Math.round((totals.p / targets.p) * 100) : 0

    // Weight trend
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
    const latest = sorted.at(-1)
    let weightLine = 'No weight data'
    if (latest) {
      weightLine = `Latest: ${latest.weight_kg} kg`
      const weekAgo = Date.now() - 7 * 86_400_000
      const week = sorted.filter((w) => new Date(w.date).getTime() >= weekAgo)
      if (week.length >= 2) {
        const first = week[0]
        const last = week[week.length - 1]
        const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000
        if (days > 0) {
          const trend = (((last.weight_kg - first.weight_kg) / days) * 7).toFixed(2)
          weightLine += `, 7-day trend: ${trend} kg/week`
        }
      }
    }

    // Today's eaten meals by slot
    const mealsBySlot: Record<string, { items: string[]; kcal: number; p: number }> = {}
    for (const e of todayEntries) {
      if (!mealsBySlot[e.meal]) mealsBySlot[e.meal] = { items: [], kcal: 0, p: 0 }
      mealsBySlot[e.meal].items.push(`${e.name}${e.qty > 1 ? ` x${e.qty}` : ''}`)
      mealsBySlot[e.meal].kcal += e.kcal * e.qty
      mealsBySlot[e.meal].p += e.p * e.qty
    }
    const todayMealsStr = Object.entries(mealsBySlot)
      .map(([slot, data]) => `${slot}: ${data.items.join(', ')} (${Math.round(data.kcal)} kcal, ${Math.round(data.p)}g P)`)
      .join('\n') || 'Nothing logged yet'

    // Recent days eating pattern (last 7 days from range)
    const recentDays = range.slice(-7)
    const avgKcal = recentDays.length > 0 ? Math.round(recentDays.reduce((s, d) => s + d.kcal, 0) / recentDays.length) : 0
    const avgP = recentDays.length > 0 ? Math.round(recentDays.reduce((s, d) => s + d.p, 0) / recentDays.length) : 0

    // Top recent foods (from myFoods sorted by use_count)
    const topFoods = myFoods
      .slice(0, 15)
      .map((f) => `${f.name}: ${f.kcal} kcal, ${f.p}p per ${f.basis}`)
      .join('\n')

    const menuStr = MENU.filter((m) => m.kcal > 50)
      .map((m) => `${m.code} ${m.name} (${m.meal}): ${m.kcal} kcal, ${m.p}p ${m.c}c ${m.f}f`)
      .join('\n')

    const stapleStr = STAPLES
      .map((s) => `${s.name}: ${s.kcal} kcal, ${s.p}p ${s.c}c ${s.f}f per ${s.basis}`)
      .join('\n')

    return `TIME: ${timeStr} (${timeLabel})

TODAY (${dayType} day):
Eaten so far: ${Math.round(totals.kcal)} kcal (${pctKcal}% of target), ${Math.round(totals.p)}g protein (${pctP}%), ${Math.round(totals.c)}g carbs, ${Math.round(totals.f)}g fat, ${Math.round(totals.fb)}g fiber
Full-day targets: ${targets.kcal} kcal, ${targets.p}g protein, ${targets.c}g carbs, ${targets.f}g fat, ${targets.fb}g fiber
Still needed: ${Math.round(remaining.kcal)} kcal, ${Math.round(remaining.p)}g protein, ${Math.round(remaining.c)}g carbs, ${Math.round(remaining.f)}g fat, ${Math.round(remaining.fb)}g fiber

TODAY'S MEALS SO FAR:
${todayMealsStr}

RECENT PATTERN (7-day avg): ${avgKcal} kcal/day, ${avgP}g protein/day

WEIGHT: ${weightLine}

MY FREQUENT FOODS:
${topFoods || 'No saved foods yet'}

MENU MEALS:
${menuStr}

STAPLES:
${stapleStr}`
  }, [totals, targets, dayType, weights, myFoods, range, todayEntries, remaining])

  async function send(prompt: string, displayText?: string) {
    if (!prompt.trim() || loading) return
    setError('')
    // Show displayText to user if provided, otherwise show the prompt
    const userMsg: Message = { role: 'user', text: displayText ?? prompt.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      let data: { reply?: string; error?: string } | undefined
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt.trim(), context }),
        })
        const ct = res.headers.get('content-type') ?? ''
        if (!ct.includes('application/json')) {
          if (res.status >= 500 && attempt === 0) continue
          throw new Error('Coach is temporarily unavailable — try again in a moment.')
        }
        try { data = await res.json() } catch { data = { error: `Server error (${res.status})` } }
        if (res.status >= 500 && attempt === 0) continue
        break
      }
      if (!data) throw new Error('Coach is temporarily unavailable — try again in a moment.')
      if (data.error) throw new Error(data.error)
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply ?? '' }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function planMyDay() {
    const displayText = 'Plan the rest of my day'
    const prompt = `Plan my remaining meals. I have ${Math.round(remaining.kcal)} kcal and ${Math.round(remaining.p)}g protein left.

REQUIREMENTS:
- Suggest 2-3 realistic meals/snacks (not one giant meal)
- Prioritize hitting protein target
- Stay within remaining calories
- Use foods from my menu, staples, or frequent foods
- Consider time of day and what I've already eaten

Start immediately with the meal list.`
    send(prompt, displayText)
  }

  const hasRemaining = remaining.kcal > 100 || remaining.p > 10

  return (
    <div className="mt-3 flex flex-col min-h-[60vh]">
      <div className="flex-1 space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="text-center mt-6">
            <p className="text-lg font-display font-semibold text-ink mb-1">Plan your day</p>
            <p className="text-sm text-inksoft/70 mb-4">
              {hasRemaining
                ? `${Math.round(remaining.kcal)} kcal & ${Math.round(remaining.p)}g protein to go`
                : "You've hit your targets!"
              }
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-forest text-paper rounded-br-md'
                  : 'bg-paper2 text-ink rounded-bl-md'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-paper2 text-inksoft px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50 text-terra px-4 py-2.5 rounded-2xl text-sm">{error}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Primary action */}
      {messages.length === 0 && hasRemaining && (
        <button
          onClick={planMyDay}
          disabled={loading}
          className="w-full bg-forest text-white font-bold py-4 rounded-xl active:opacity-90 disabled:opacity-50 mb-3"
        >
          Plan my remaining meals
        </button>
      )}

      {/* Quick actions after conversation starts */}
      {messages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={planMyDay}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-forest/30 text-forest bg-white active:bg-forest/10 disabled:opacity-40"
          >
            Re-plan my day
          </button>
          <button
            onClick={() => send('Grade my day so far')}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-forest/30 text-forest bg-white active:bg-forest/10 disabled:opacity-40"
          >
            Grade my day
          </button>
        </div>
      )}

      {/* Free-form input toggle */}
      {!showInput && messages.length === 0 && (
        <button
          onClick={() => setShowInput(true)}
          className="text-sm text-inksoft/60 py-2"
        >
          Or ask a question...
        </button>
      )}

      {/* Free-form input */}
      {(showInput || messages.length > 0) && (
        <div className="flex gap-2">
          <input
            className="flex-1 text-sm px-4 py-3 rounded-xl border border-line bg-white focus:outline-none focus:border-terra"
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send(input)
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="bg-forest text-paper font-bold px-4 py-3 rounded-xl active:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
