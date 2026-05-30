export type MealId = 'breakfast' | 'snack' | 'lunch' | 'prewo' | 'dinner' | 'extras'

export interface Meal { id: MealId; name: string; color: string }

export interface MenuItem {
  code: string
  meal: MealId
  name: string
  kcal: number
  p: number
  c: number
  f: number
}

export interface LogEntry {
  id: string
  user_id?: string
  date: string
  meal: MealId
  name: string
  kcal: number
  p: number
  c: number
  f: number
  qty: number
  created_at?: string
}

export interface MyFood {
  id: string
  user_id?: string
  name: string
  basis: 'serving' | '100g'
  kcal: number
  p: number
  c: number
  f: number
  use_count: number
  last_used: string
}

export interface WeightEntry {
  id?: string
  user_id?: string
  date: string
  weight_kg: number
}

export interface Targets { kcal: number; p: number; c: number; f: number }

export interface Settings {
  user_id?: string
  training: Targets
  rest: Targets
}

export type DayType = 'training' | 'rest'
