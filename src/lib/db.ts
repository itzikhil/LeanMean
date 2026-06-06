import { supabase } from './supabase'
import type { DayType, LogEntry, MealId, MyFood, SavedMeal, SavedMealItem, Settings, WeightEntry } from './types'
import { DEFAULT_SETTINGS } from './targets'


let _uid: string | null = null
async function uid(): Promise<string | undefined> {
  if (_uid) return _uid
  const { data } = await supabase.auth.getUser()
  _uid = data.user?.id ?? null
  return _uid ?? undefined
}

export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ---------- Food log ----------
export async function getLog(date: string): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as LogEntry[]
}

export async function addLog(e: Omit<LogEntry, 'id' | 'created_at'>): Promise<LogEntry> {
  const { data, error } = await supabase
    .from('food_logs')
    .insert({ ...e, user_id: await uid() })
    .select()
    .single()
  if (error) throw error
  return data as LogEntry
}

export async function updateQty(id: string, qty: number): Promise<void> {
  const { error } = await supabase.from('food_logs').update({ qty }).eq('id', id)
  if (error) throw error
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) throw error
}

export async function updateMeal(id: string, meal: MealId): Promise<void> {
  const { error } = await supabase.from('food_logs').update({ meal }).eq('id', id)
  if (error) throw error
}

// Migrate legacy meal types to simplified meals
export async function migrateMeals(): Promise<number> {
  const userId = await uid()
  if (!userId) return 0

  // Map prewo and extras to snack
  const { data: prewoData } = await supabase
    .from('food_logs')
    .update({ meal: 'snack' })
    .eq('user_id', userId)
    .eq('meal', 'prewo')
    .select('id')

  const { data: extrasData } = await supabase
    .from('food_logs')
    .update({ meal: 'snack' })
    .eq('user_id', userId)
    .eq('meal', 'extras')
    .select('id')

  return (prewoData?.length ?? 0) + (extrasData?.length ?? 0)
}

export async function copyEntries(fromDate: string, toDate: string, meal?: MealId): Promise<void> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('meal,name,kcal,p,c,f,fb,qty')
    .eq('date', fromDate)
  if (error) throw error
  const rows = (data ?? []).filter((r) => !meal || r.meal === meal)
  if (!rows.length) return
  const userId = await uid()
  const inserts = rows.map((r) => ({ ...r, date: toDate, user_id: userId }))
  const { error: insertErr } = await supabase.from('food_logs').insert(inserts)
  if (insertErr) throw insertErr
}

// ---------- My Foods (recents) ----------
export async function getMyFoods(): Promise<MyFood[]> {
  const { data, error } = await supabase
    .from('my_foods')
    .select('*')
    .order('use_count', { ascending: false })
    .order('last_used', { ascending: false })
    .limit(40)
  if (error) throw error
  return (data ?? []) as MyFood[]
}

export async function upsertMyFood(f: Omit<MyFood, 'id' | 'use_count' | 'last_used'>): Promise<void> {
  // Bump if name already exists, else insert.
  const { data: existing } = await supabase.from('my_foods').select('*').eq('name', f.name).maybeSingle()
  if (existing) {
    await supabase
      .from('my_foods')
      .update({ use_count: (existing.use_count ?? 0) + 1, last_used: new Date().toISOString(), ...f })
      .eq('id', existing.id)
  } else {
    await supabase.from('my_foods').insert({ ...f, user_id: await uid(), use_count: 1, last_used: new Date().toISOString() })
  }
}

export async function deleteMyFood(id: string): Promise<void> {
  await supabase.from('my_foods').delete().eq('id', id)
}

// ---------- Weight ----------
export async function getWeights(sinceDays = 90): Promise<WeightEntry[]> {
  const since = new Date()
  since.setDate(since.getDate() - sinceDays)
  const { data, error } = await supabase
    .from('weights')
    .select('*')
    .gte('date', ymd(since))
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []) as WeightEntry[]
}

export async function setWeight(date: string, weight_kg: number): Promise<void> {
  const { error } = await supabase.from('weights').upsert({ user_id: await uid(), date, weight_kg }, { onConflict: 'user_id,date' })
  if (error) throw error
}

// ---------- Day meta (type, steps) ----------
export async function getDayMeta(date: string): Promise<{ day_type: DayType; steps: number; steps_goal: number }> {
  const { data } = await supabase.from('day_meta').select('day_type,steps,steps_goal').eq('date', date).maybeSingle()
  return {
    day_type: (data?.day_type as DayType) ?? 'training',
    steps: data?.steps ?? 0,
    steps_goal: data?.steps_goal ?? 8000,
  }
}

export async function getDayType(date: string): Promise<DayType> {
  const meta = await getDayMeta(date)
  return meta.day_type
}

export async function setDayType(date: string, day_type: DayType): Promise<void> {
  await supabase.from('day_meta').upsert({ user_id: await uid(), date, day_type }, { onConflict: 'user_id,date' })
}

export async function setSteps(date: string, steps: number): Promise<void> {
  await supabase.from('day_meta').upsert({ user_id: await uid(), date, steps }, { onConflict: 'user_id,date' })
}

export interface StepsEntry { date: string; steps: number }

export async function getSteps(sinceDays = 90): Promise<StepsEntry[]> {
  const since = new Date()
  since.setDate(since.getDate() - sinceDays)
  const { data, error } = await supabase
    .from('day_meta')
    .select('date,steps')
    .gte('date', ymd(since))
    .gt('steps', 0)
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []).map((d) => ({ date: d.date, steps: d.steps ?? 0 }))
}

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  const { data } = await supabase.from('settings').select('*').maybeSingle()
  if (!data) return DEFAULT_SETTINGS
  return {
    training: { kcal: data.training_kcal, p: data.training_p, c: data.training_c, f: data.training_f, fb: data.training_fb ?? 30 },
    rest: { kcal: data.rest_kcal, p: data.rest_p, c: data.rest_c, f: data.rest_f, fb: data.rest_fb ?? 30 },
    stepsGoal: data.steps_goal ?? 8000,
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  await supabase.from('settings').upsert(
    {
      user_id: uid,
      training_kcal: s.training.kcal, training_p: s.training.p, training_c: s.training.c, training_f: s.training.f, training_fb: s.training.fb,
      rest_kcal: s.rest.kcal, rest_p: s.rest.p, rest_c: s.rest.c, rest_f: s.rest.f, rest_fb: s.rest.fb,
      steps_goal: s.stepsGoal,
    },
    { onConflict: 'user_id' },
  )
}

// ---------- Saved Meals ----------
export async function getSavedMeals(): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SavedMeal[]
}

export async function saveMeal(name: string, items: SavedMealItem[]): Promise<void> {
  const { error } = await supabase
    .from('saved_meals')
    .insert({ user_id: await uid(), name, items })
  if (error) throw error
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const { error } = await supabase.from('saved_meals').delete().eq('id', id)
  if (error) throw error
}

// ---------- Batch add ----------
export async function addLogs(entries: Omit<LogEntry, 'id' | 'created_at'>[]): Promise<void> {
  const userId = await uid()
  const rows = entries.map((e) => ({ ...e, user_id: userId }))
  const { error } = await supabase.from('food_logs').insert(rows)
  if (error) throw error
}

// ---------- Time-of-day suggestions ----------
export interface Suggestion { name: string; kcal: number; p: number; c: number; f: number; fb: number; meal: MealId; count: number }

export async function getTimeSuggestions(window: 'morning' | 'midday' | 'evening'): Promise<Suggestion[]> {
  // Map window to hour ranges
  const ranges = { morning: [5, 11], midday: [11, 16], evening: [16, 23] } as const
  const [startHour, endHour] = ranges[window]

  // Query last 30 days of logs with created_at timestamps
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const { data, error } = await supabase
    .from('food_logs')
    .select('name,kcal,p,c,f,fb,meal,created_at')
    .gte('date', ymd(since))
  if (error) throw error

  // Bucket by hour of created_at
  const freq = new Map<string, { name: string; kcal: number; p: number; c: number; f: number; fb: number; meal: MealId; count: number }>()
  for (const r of data ?? []) {
    if (!r.created_at) continue
    const hour = new Date(r.created_at).getHours()
    if (hour < startHour || hour >= endHour) continue
    const key = r.name as string
    const existing = freq.get(key)
    if (existing) {
      existing.count++
    } else {
      freq.set(key, { name: key, kcal: r.kcal, p: r.p, c: r.c, f: r.f, fb: r.fb ?? 0, meal: r.meal as MealId, count: 1 })
    }
  }

  return Array.from(freq.values())
    .filter((s) => s.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

// ---------- Weekly aggregate ----------
export interface DayTotal { date: string; kcal: number; p: number; c: number; f: number; fb: number }

export async function getRange(days: number): Promise<DayTotal[]> {
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const { data, error } = await supabase
    .from('food_logs')
    .select('date,kcal,p,c,f,fb,qty')
    .gte('date', ymd(since))
  if (error) throw error
  const map = new Map<string, DayTotal>()
  for (const r of data ?? []) {
    const key = r.date as string
    const t = map.get(key) ?? { date: key, kcal: 0, p: 0, c: 0, f: 0, fb: 0 }
    t.kcal += r.kcal * r.qty
    t.p += r.p * r.qty
    t.c += r.c * r.qty
    t.f += r.f * r.qty
    t.fb += (r.fb ?? 0) * r.qty
    map.set(key, t)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}
