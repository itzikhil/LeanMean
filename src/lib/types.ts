export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Meal { id: MealId; name: string; color: string }

export interface MenuItem {
  code: string
  meal: MealId
  name: string
  kcal: number
  p: number
  c: number
  f: number
  fb: number
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
  fb: number
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
  fb: number
  use_count: number
  last_used: string
}

export interface WeightEntry {
  id?: string
  user_id?: string
  date: string
  weight_kg: number
}

export interface Targets { kcal: number; p: number; c: number; f: number; fb: number }

export interface Settings {
  user_id?: string
  training: Targets
  rest: Targets
}

export interface SavedMealItem {
  name: string
  kcal: number
  p: number
  c: number
  f: number
  fb: number
  qty: number
}

export interface SavedMeal {
  id: string
  user_id?: string
  name: string
  items: SavedMealItem[]
  created_at?: string
}

export type DayType = 'training' | 'rest'

export interface DayMeta {
  date: string
  day_type: DayType
  steps?: number
  steps_goal?: number
}
