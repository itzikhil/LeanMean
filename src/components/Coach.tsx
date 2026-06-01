import { useEffect, useMemo, useRef, useState } from 'react'
import { MENU } from '../lib/menu'
import { STAPLES } from '../lib/staples'
import type { Targets, WeightEntry } from '../lib/types'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface Props {
  totals: { kcal: number; p: number; c: number; f: number; fb: number }
  targets: Targets
  dayType: 'training' | 'rest'
  weights: WeightEntry[]
}

const QUICK_ACTIONS = [
  'Grade my day',
  'Pre-workout meal',
  'Post-workout meal',
  'What should I eat next?',
]

export default function Coach({ totals, targets, dayType, weights }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const context = useMemo(() => {
    const remaining = {
      kcal: targets.kcal - totals.kcal,
      p: targets.p - totals.p,
      c: targets.c - totals.c,
      f: targets.f - totals.f,
      fb: targets.fb - totals.fb,
    }

    const now = new Date()
    const hour = now.getHours()
    const timeLabel = hour < 10 ? 'early morning' : hour < 12 ? 'late morning' : hour < 14 ? 'midday' : hour < 17 ? 'afternoon' : hour < 20 ? 'evening' : 'late evening'
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const pctKcal = targets.kcal > 0 ? Math.round((totals.kcal / targets.kcal) * 100) : 0
    const pctP = targets.p > 0 ? Math.round((totals.p / targets.p) * 100) : 0

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

    const menuStr = MENU.filter((m) => m.meal !== 'extras')
      .map((m) => `${m.code} ${m.name} (${m.meal}): ${m.kcal} kcal, ${m.p}p ${m.c}c ${m.f}f ${m.fb}fb`)
      .join('\n')

    const stapleStr = STAPLES
      .map((s) => `${s.name}: ${s.kcal} kcal, ${s.p}p ${s.c}c ${s.f}f ${s.fb}fb per ${s.basis}`)
      .join('\n')

    return `TIME: ${timeStr} (${timeLabel})

TODAY (${dayType} day):
Eaten so far: ${Math.round(totals.kcal)} kcal (${pctKcal}% of target), ${Math.round(totals.p)}g protein (${pctP}%), ${Math.round(totals.c)}g carbs, ${Math.round(totals.f)}g fat, ${Math.round(totals.fb)}g fiber
Full-day targets: ${targets.kcal} kcal, ${targets.p}g protein, ${targets.c}g carbs, ${targets.f}g fat, ${targets.fb}g fiber
Still available: ${Math.round(remaining.kcal)} kcal, ${Math.round(remaining.p)}g protein, ${Math.round(remaining.c)}g carbs, ${Math.round(remaining.f)}g fat, ${Math.round(remaining.fb)}g fiber

WEIGHT: ${weightLine}

MENU MEALS:
${menuStr}

STAPLES:
${stapleStr}`
  }, [totals, targets, dayType, weights])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setError('')
    const userMsg: Message = { role: 'user', text: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col min-h-[60vh]">
      <div className="flex-1 space-y-3 mb-3">
        {messages.length === 0 && (
          <p className="text-center text-inksoft/60 text-sm mt-8">
            Ask your AI coach anything about nutrition and fitness.
          </p>
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

      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_ACTIONS.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-forest/30 text-forest bg-white active:bg-forest/10 disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 text-sm px-4 py-3 rounded-xl border border-line bg-white focus:outline-none focus:border-terra"
          type="text"
          placeholder="Ask your coach..."
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
    </div>
  )
}
