import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import {
  addLog, addLogs, copyEntries, deleteLog, deleteSavedMeal as dbDeleteSavedMeal, deleteMyFood as dbDeleteMyFood,
  getDayMeta, getLog, getMyFoods, getRange, getSavedMeals, getSettings, getWeights,
  saveMeal as dbSaveMeal, saveSettings as dbSaveSettings, setDayType, setSteps, setWeight,
  updateMeal, updateQty, upsertMyFood, migrateMeals, ymd, type DayTotal,
} from './lib/db'
import { DEFAULT_SETTINGS } from './lib/targets'
import type { DayType, LogEntry, MealId, MyFood, SavedMeal, SavedMealItem, Settings as TSettings, WeightEntry } from './lib/types'
import Auth from './components/Auth'
import Summary from './components/Summary'
import LogList from './components/LogList'
import AddSheet from './components/AddSheet'
import WeeklyDashboard from './components/WeeklyDashboard'
import Settings from './components/Settings'
import ProteinCoach from './components/ProteinCoach'
import QuickSuggestions from './components/QuickSuggestions'
import Coach from './components/Coach'
import ShareDayCard from './components/ShareDayCard'
import { shareDay } from './lib/shareDay'

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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [range, setRange] = useState<DayTotal[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [sheet, setSheet] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [steps, setStepsState] = useState(0)
  const [stepsGoal, setStepsGoal] = useState(8000)
  const [editingSteps, setEditingSteps] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

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
    const [log, meta] = await Promise.all([getLog(dstr), getDayMeta(dstr)])
    setEntries(log)
    setDay(meta.day_type)
    setStepsState(meta.steps)
    setStepsGoal(meta.steps_goal)
  }, [session, dstr])

  useEffect(() => {
    if (!session) return
    // Migrate legacy meal types on login
    migrateMeals().catch(console.error)
    getSettings().then(setSettings)
    getMyFoods().then(setMyFoods)
    getSavedMeals().then(setSavedMeals)
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
    (a, e) => ({ kcal: a.kcal + e.kcal * e.qty, p: a.p + e.p * e.qty, c: a.c + e.c * e.qty, f: a.f + e.f * e.qty, fb: a.fb + (e.fb ?? 0) * e.qty }),
    { kcal: 0, p: 0, c: 0, f: 0, fb: 0 },
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
  async function handleAddMultiple(entries: Omit<LogEntry, 'id' | 'created_at' | 'date' | 'user_id'>[]) {
    const rows = entries.map((e) => ({ ...e, date: dstr }))
    await addLogs(rows)
    await loadDay()
    getMyFoods().then(setMyFoods)
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
  async function handleSaveMeal(name: string, items: SavedMealItem[]) {
    await dbSaveMeal(name, items)
    getSavedMeals().then(setSavedMeals)
  }
  async function handleDeleteSavedMeal(id: string) {
    setSavedMeals(savedMeals.filter((m) => m.id !== id))
    await dbDeleteSavedMeal(id)
  }
  async function handleAddSavedMeal(meal: MealId, items: SavedMealItem[]) {
    const entries = items.map((item) => ({
      meal,
      name: item.name,
      kcal: item.kcal,
      p: item.p,
      c: item.c,
      f: item.f,
      fb: item.fb ?? 0,
      qty: item.qty,
      date: dstr,
    }))
    await addLogs(entries)
    await loadDay()
  }
  async function handleSaveSettings(s: TSettings) {
    setSettings(s)
    await dbSaveSettings(s)
    setView('today')
  }

  async function handleMoveMeal(id: string, meal: MealId) {
    setEntries(entries.map((e) => e.id === id ? { ...e, meal } : e))
    await updateMeal(id, meal)
  }

  async function handleUpdateSteps(newSteps: number, newGoal?: number) {
    setStepsState(newSteps)
    if (newGoal !== undefined) setStepsGoal(newGoal)
    await setSteps(dstr, newSteps, newGoal)
  }

  async function handleShareDay() {
    setSharing(true)
    // Wait for next frame so the card renders
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    if (shareCardRef.current) {
      try {
        await shareDay(shareCardRef.current, dstr)
      } catch (err) {
        console.error('[LeanKitchen] Share failed:', err)
      }
    }
    setSharing(false)
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
          <button onClick={() => supabase.auth.signOut()} className="w-12 text-right text-[.7rem] text-inksoft/60 active:text-inksoft">
            Sign out
          </button>
        </div>
        {view === 'today' && (
          <div className="relative flex items-center justify-center gap-4 mt-3">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d) }} className="text-2xl text-inksoft px-2.5 active:opacity-60">‹</button>
            <span className="font-display font-semibold text-base min-w-[150px]">{dateText}</span>
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d) }} className="text-2xl text-inksoft px-2.5 active:opacity-60">›</button>
            {entries.length > 0 && (
              <button
                onClick={handleShareDay}
                disabled={sharing}
                className="absolute right-0 text-inksoft/60 active:text-inksoft disabled:opacity-50 p-1"
                title="Share day"
              >
                {sharing ? (
                  <span className="text-xs">...</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
      </header>

      {view === 'today' && (
        <>
          <div className="mt-3"><Summary totals={totals} targets={targets} dayType={dayType} onToggleDay={toggleDay} /></div>

          {/* Steps tracker */}
          <div className="mt-4 bg-paper2 border border-line rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">👟</span>
                <span className="font-display font-semibold text-[.95rem]">Steps</span>
              </div>
              {editingSteps ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={steps}
                    onChange={(e) => setStepsState(+e.target.value || 0)}
                    className="w-20 text-center text-sm px-2 py-1 border border-line rounded-lg bg-white focus:outline-none focus:border-terra"
                    autoFocus
                  />
                  <span className="text-inksoft/60 text-sm">/</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={stepsGoal}
                    onChange={(e) => setStepsGoal(+e.target.value || 8000)}
                    className="w-20 text-center text-sm px-2 py-1 border border-line rounded-lg bg-white focus:outline-none focus:border-terra"
                  />
                  <button
                    onClick={() => { handleUpdateSteps(steps, stepsGoal); setEditingSteps(false) }}
                    className="text-forest font-bold text-sm px-2"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingSteps(true)}
                  className="text-sm text-inksoft active:text-forest"
                >
                  <span className="font-display font-bold text-forest">{steps.toLocaleString()}</span>
                  <span className="text-inksoft/60"> / {stepsGoal.toLocaleString()}</span>
                </button>
              )}
            </div>
            <div className="mt-2 h-2 rounded-md bg-line overflow-hidden">
              <div
                className="h-full rounded-md bg-forest transition-all duration-300"
                style={{ width: Math.min(100, (steps / stepsGoal) * 100) + '%' }}
              />
            </div>
            <div className="text-[.72rem] text-inksoft/70 mt-1 text-right">
              {steps >= stepsGoal ? 'Goal reached!' : `${(stepsGoal - steps).toLocaleString()} to go`}
            </div>
          </div>

          <QuickSuggestions onAdd={handleAdd} />
          <ProteinCoach totals={totals} targets={targets} />
          <LogList entries={entries} onQty={handleQty} onDelete={handleDelete} onCopyMeal={handleCopyMeal} onCopyDay={handleCopyDay} onSaveMeal={handleSaveMeal} onMoveMeal={handleMoveMeal} />
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

      <AddSheet open={sheet} onClose={() => setSheet(false)} onAdd={handleAdd} onAddMultiple={handleAddMultiple} myFoods={myFoods} onSaveMyFood={handleSaveMyFood} onDeleteMyFood={handleDeleteMyFood} savedMeals={savedMeals} onDeleteSavedMeal={handleDeleteSavedMeal} onAddSavedMeal={handleAddSavedMeal} totals={totals} targets={targets} />

      {/* Hidden offscreen container for share image rendering */}
      {sharing && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <ShareDayCard
            ref={shareCardRef}
            date={date}
            totals={totals}
            targets={targets}
            dayType={dayType}
            entries={entries}
          />
        </div>
      )}
    </div>
  )
}
