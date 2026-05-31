import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import {
  addLog, copyEntries, deleteLog, deleteMyFood as dbDeleteMyFood, getDayType, getLog, getMyFoods, getRange,
  getSettings, getWeights, saveSettings as dbSaveSettings, setDayType, setWeight, updateQty, upsertMyFood, ymd, type DayTotal,
} from './lib/db'
import { DEFAULT_SETTINGS } from './lib/targets'
import type { DayType, LogEntry, MealId, MyFood, Settings as TSettings, WeightEntry } from './lib/types'
import Auth from './components/Auth'
import Summary from './components/Summary'
import LogList from './components/LogList'
import AddSheet from './components/AddSheet'
import WeeklyDashboard from './components/WeeklyDashboard'
import Settings from './components/Settings'
import ProteinCoach from './components/ProteinCoach'
import Coach from './components/Coach'

type View = 'today' | 'week' | 'coach' | 'settings'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [view, setView] = useState<View>('today')
  const [date, setDate] = useState(new Date())
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [settings, setSettings] = useState<TSettings>(DEFAULT_SETTINGS)
  const [dayType, setDay] = useState<DayType>('training')
  const [myFoods, setMyFoods] = useState<MyFood[]>([])
  const [range, setRange] = useState<DayTotal[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [sheet, setSheet] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const dstr = ymd(date)

  const loadDay = useCallback(async () => {
    if (!session) return
    const [log, dt] = await Promise.all([getLog(dstr), getDayType(dstr)])
    setEntries(log)
    setDay(dt)
  }, [session, dstr])

  useEffect(() => {
    if (!session) return
    getSettings().then(setSettings)
    getMyFoods().then(setMyFoods)
  }, [session])

  useEffect(() => { loadDay() }, [loadDay])

  useEffect(() => {
    if (!session) return
    if (view === 'week') {
      getRange(14).then(setRange)
      getWeights(90).then(setWeights)
    } else if (view === 'coach') {
      getWeights(90).then(setWeights)
    }
  }, [session, view])

  const totals = entries.reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal * e.qty, p: a.p + e.p * e.qty, c: a.c + e.c * e.qty, f: a.f + e.f * e.qty }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  )
  const targets = settings[dayType]

  async function handleAdd(e: Omit<LogEntry, 'id' | 'created_at' | 'date' | 'user_id'>) {
    try {
      await addLog({ ...e, date: dstr })
      await loadDay()
      getMyFoods().then(setMyFoods)
    } catch (err) {
      console.error('[LeanKitchen] food_logs insert failed:', err)
      throw err
    }
  }
  async function handleQty(id: string, delta: number) {
    const e = entries.find((x) => x.id === id); if (!e) return
    const qty = Math.max(0.5, Math.round((e.qty + delta) * 2) / 2)
    setEntries(entries.map((x) => (x.id === id ? { ...x, qty } : x)))
    await updateQty(id, qty)
  }
  async function handleDelete(id: string) {
    setEntries(entries.filter((x) => x.id !== id))
    await deleteLog(id)
  }
  async function toggleDay() {
    const next: DayType = dayType === 'training' ? 'rest' : 'training'
    setDay(next)
    await setDayType(dstr, next)
  }
  async function handleSaveMyFood(f: Omit<MyFood, 'id' | 'use_count' | 'last_used'>) {
    await upsertMyFood(f)
  }
  async function handleDeleteMyFood(id: string) {
    setMyFoods(myFoods.filter((x) => x.id !== id))
    await dbDeleteMyFood(id)
  }
  async function handleLogWeight(kg: number) {
    await setWeight(ymd(new Date()), kg)
    getWeights(90).then(setWeights)
  }
  async function handleCopyMeal(meal: MealId, fromDate: string) {
    await copyEntries(fromDate, dstr, meal)
    await loadDay()
  }
  async function handleCopyDay(fromDate: string) {
    await copyEntries(fromDate, dstr)
    await loadDay()
  }
  async function handleSaveSettings(s: TSettings) {
    setSettings(s)
    await dbSaveSettings(s)
    setView('today')
  }

  const dateText = (() => {
    if (ymd(date) === ymd(new Date())) return 'Today'
    const y = new Date(); y.setDate(y.getDate() - 1)
    if (ymd(date) === ymd(y)) return 'Yesterday'
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  })()

  if (!authReady) return <div className="min-h-full grid place-items-center text-inksoft">Loading...</div>
  if (!session) return <Auth />

  return (
    <div className="max-w-[480px] mx-auto px-4 pb-28">
      <header className="text-center pt-6 pb-2">
        <div className="flex items-center justify-between">
          <span className="w-12" />
          <div className="font-display font-black text-[1.45rem] text-forest leading-none">
            Lean <span className="italic font-medium text-terra">Kitchen</span>
          </div>
          <span className="w-12" />
        </div>
        {view === 'today' && (
          <div className="flex items-center justify-center gap-4 mt-3">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d) }} className="text-2xl text-inksoft px-2.5 active:opacity-60">‹</button>
            <span className="font-display font-semibold text-base min-w-[150px]">{dateText}</span>
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d) }} className="text-2xl text-inksoft px-2.5 active:opacity-60">›</button>
          </div>
        )}
      </header>

      {view === 'today' && (
        <>
          <div className="mt-3"><Summary totals={totals} targets={targets} dayType={dayType} onToggleDay={toggleDay} /></div>
          <ProteinCoach totals={totals} targets={targets} />
          <LogList entries={entries} onQty={handleQty} onDelete={handleDelete} onCopyMeal={handleCopyMeal} onCopyDay={handleCopyDay} />
        </>
      )}
      {view === 'week' && (
        <WeeklyDashboard range={range} weights={weights} goalKcal={targets.kcal} goalP={targets.p} onLogWeight={handleLogWeight} />
      )}
      {view === 'coach' && (
        <Coach totals={totals} targets={targets} dayType={dayType} weights={weights} />
      )}
      {view === 'settings' && <Settings settings={settings} onSave={handleSaveSettings} />}

      {view === 'today' && (
        <button onClick={() => setSheet(true)}
          className="fixed left-1/2 -translate-x-1/2 bottom-[84px] bg-terra text-white font-bold text-base px-7 py-3.5 rounded-full shadow-[0_12px_26px_-10px_rgba(192,98,58,.8)] z-30 active:scale-95 transition-transform">
          ＋ Add food
        </button>
      )}

      <nav className="fixed left-0 right-0 bottom-0 max-w-[480px] mx-auto bg-paper2 border-t border-line flex z-20">
        {([['today', 'Today', '🍽'], ['week', 'Trends', '📈'], ['coach', 'Coach', '💬'], ['settings', 'Targets', '🎯']] as [View, string, string][]).map(([v, label, icon]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-3 text-[.7rem] font-bold ${view === v ? 'text-forest' : 'text-inksoft/60'}`}>
            <div className="text-lg leading-none mb-1">{icon}</div>{label}
          </button>
        ))}
      </nav>

      <AddSheet open={sheet} onClose={() => setSheet(false)} onAdd={handleAdd} myFoods={myFoods} onSaveMyFood={handleSaveMyFood} onDeleteMyFood={handleDeleteMyFood} />
    </div>
  )
}
