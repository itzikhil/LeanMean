import { forwardRef } from 'react'
import { MEALS } from '../lib/menu'
import type { DayType, LogEntry, Targets } from '../lib/types'

interface Totals { kcal: number; p: number; c: number; f: number; fb: number }

const r = (n: number) => Math.round(n)

function formatTime(isoString?: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function MacroBar({ label, val, goal, fill }: { label: string; val: number; goal: number; fill: string }) {
  const pct = Math.min(100, (val / goal) * 100)
  const over = val > goal
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, opacity: 0.85 }}>{label}</div>
      <div style={{ height: 6, borderRadius: 4, background: 'rgba(244,237,224,0.2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, width: pct + '%', background: fill }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6 }}>
        {r(val)} / {goal}g
      </div>
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
        {over ? <span style={{ color: '#ffb4a8' }}>{r(val - goal)}g over</span> : `${r(goal - val)}g left`}
      </div>
    </div>
  )
}

interface ShareDayCardProps {
  date: Date
  totals: Totals
  targets: Targets
  dayType: DayType
  entries: LogEntry[]
}

const ShareDayCard = forwardRef<HTMLDivElement, ShareDayCardProps>(
  ({ date, totals, targets, dayType, entries }, ref) => {
    const left = targets.kcal - totals.kcal
    const calPct = Math.min(100, (totals.kcal / targets.kcal) * 100)
    const over = totals.kcal > targets.kcal

    return (
      <div
        ref={ref}
        style={{
          width: 400,
          padding: 24,
          background: '#f4ede0',
          fontFamily: 'Karla, system-ui, sans-serif',
          color: '#23201a',
          borderRadius: 20,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 22, color: '#2f4a3a', marginBottom: 4 }}>
            Lean <span style={{ fontWeight: 500, fontStyle: 'italic', color: '#c0623a' }}>Kitchen</span>
          </div>
          <div style={{ fontSize: 14, color: '#6b6356', fontWeight: 500 }}>{formatDate(date)}</div>
          <div style={{ fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1, color: '#6b6356' }}>
            {dayType === 'training' ? '🏋️ Training day' : '😴 Rest day'}
          </div>
        </div>

        {/* Calories Summary */}
        <div style={{
          background: '#2f4a3a',
          color: '#f4ede0',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7, letterSpacing: 1, marginBottom: 4 }}>kcal left</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 44, lineHeight: 1 }}>{r(left)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14 }}>
                <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700 }}>{r(totals.kcal)}</span> eaten
              </div>
              <div style={{ fontSize: 14, opacity: 0.85 }}>
                <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700 }}>{targets.kcal}</span> goal
              </div>
            </div>
          </div>

          {/* Calorie progress bar */}
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(244,237,224,0.2)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', borderRadius: 4, width: calPct + '%', background: over ? '#bb3b2e' : '#b88a2e' }} />
          </div>

          {/* Macro bars */}
          <div style={{ display: 'flex', gap: 12 }}>
            <MacroBar label="Protein" val={totals.p} goal={targets.p} fill="#e98aa0" />
            <MacroBar label="Carbs" val={totals.c} goal={targets.c} fill="#e7c46a" />
            <MacroBar label="Fat" val={totals.f} goal={targets.f} fill="#7fb8b3" />
            <MacroBar label="Fiber" val={totals.fb} goal={targets.fb} fill="#8B7355" />
          </div>
        </div>

        {/* Food Log */}
        {entries.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6b6356', marginBottom: 12 }}>
              Today's Log
            </div>
            {MEALS.map((m) => {
              const items = entries.filter((e) => e.meal === m.id)
              if (!items.length) return null
              const mk = items.reduce((s, e) => s + e.kcal * e.qty, 0)
              return (
                <div key={m.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: m.color }} />
                    <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#6b6356' }}>{r(mk)} kcal</span>
                  </div>
                  {items.map((e, i) => (
                    <div key={i} style={{
                      background: '#fbf7ef',
                      border: '1px solid #ddd0bb',
                      borderRadius: 10,
                      padding: '8px 12px',
                      marginBottom: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}{e.qty !== 1 && <span style={{ fontWeight: 400, opacity: 0.7 }}> ×{e.qty}</span>}</div>
                        <div style={{ fontSize: 10, color: '#6b6356', marginTop: 2 }}>
                          <span>{r(e.kcal * e.qty)} kcal</span>
                          <span style={{ marginLeft: 8, color: '#9c3d52' }}>{r(e.p * e.qty)}P</span>
                          <span style={{ marginLeft: 6, color: '#b07d1e' }}>{r(e.c * e.qty)}C</span>
                          <span style={{ marginLeft: 6, color: '#3f6e6a' }}>{r(e.f * e.qty)}F</span>
                        </div>
                      </div>
                      {e.created_at && (
                        <div style={{ fontSize: 10, color: '#6b6356', whiteSpace: 'nowrap' }}>
                          {formatTime(e.created_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #ddd0bb' }}>
          <div style={{ fontSize: 10, color: '#6b6356' }}>Tracked with Lean Kitchen</div>
        </div>
      </div>
    )
  }
)

ShareDayCard.displayName = 'ShareDayCard'

export default ShareDayCard
