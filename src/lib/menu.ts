import type { Meal, MenuItem } from './types'

export const MEALS: Meal[] = [
  { id: 'breakfast', name: 'Breakfast', color: '#d98a2b' },
  { id: 'lunch', name: 'Lunch', color: '#3f7a4f' },
  { id: 'dinner', name: 'Dinner', color: '#3a5a7a' },
  { id: 'snack', name: 'Snack', color: '#b8506e' },
]

export const MEAL_NAME: Record<string, string> = Object.fromEntries(MEALS.map((m) => [m.id, m.name]))
export const MEAL_COLOR: Record<string, string> = Object.fromEntries(MEALS.map((m) => [m.id, m.color]))

export const MENU: MenuItem[] = [
  { code: 'B1', meal: 'breakfast', name: 'Egg & Potato Scramble', kcal: 465, p: 39, c: 41, f: 16, fb: 4 },
  { code: 'B2', meal: 'breakfast', name: 'Skyr Protein Bowl', kcal: 446, p: 53, c: 53, f: 4, fb: 5 },
  { code: 'B3', meal: 'breakfast', name: 'Mince & Egg Hash', kcal: 408, p: 37, c: 26, f: 15, fb: 3 },
  { code: 'S1', meal: 'snack', name: 'Yogurt Berry Bowl', kcal: 348, p: 32, c: 51, f: 3, fb: 4 },
  { code: 'S2', meal: 'snack', name: 'Eggs & Fruit', kcal: 319, p: 29, c: 26, f: 10, fb: 3 },
  { code: 'S3', meal: 'snack', name: 'Shake & Fruit', kcal: 335, p: 39, c: 42, f: 3, fb: 3 },
  { code: 'L1', meal: 'lunch', name: 'Chicken & Rice', kcal: 508, p: 46, c: 55, f: 9, fb: 2 },
  { code: 'L2', meal: 'lunch', name: 'Mince Bolognese', kcal: 521, p: 43, c: 59, f: 9, fb: 5 },
  { code: 'L3', meal: 'lunch', name: 'Chicken-Thigh & Sweet Potato', kcal: 490, p: 38, c: 50, f: 14, fb: 5 },
  { code: 'P1', meal: 'snack', name: 'Protein Shake', kcal: 230, p: 38, c: 15, f: 3, fb: 0 },
  { code: 'P2', meal: 'snack', name: 'Skyr + PB', kcal: 170, p: 27, c: 12, f: 2, fb: 0 },
  { code: 'D1', meal: 'dinner', name: 'Salmon & Sweet Potato', kcal: 524, p: 33, c: 40, f: 24, fb: 5 },
  { code: 'D2', meal: 'dinner', name: 'Chicken-Thigh Rice Bowl', kcal: 553, p: 39, c: 59, f: 18, fb: 3 },
  { code: 'D3', meal: 'dinner', name: 'Mince & Potato Mash', kcal: 462, p: 43, c: 42, f: 9, fb: 4 },
  { code: 'SRI', meal: 'snack', name: 'Sriracha (1 tbsp)', kcal: 15, p: 0, c: 3, f: 0, fb: 0 },
  { code: 'MUS', meal: 'snack', name: 'Mustard (1 tbsp)', kcal: 9, p: 0, c: 1, f: 0, fb: 0 },
  { code: 'HOT', meal: 'snack', name: 'Hot sauce (1 tbsp)', kcal: 5, p: 0, c: 1, f: 0, fb: 0 },
  { code: 'SOY', meal: 'snack', name: 'Soy sauce (1 tbsp)', kcal: 9, p: 1, c: 1, f: 0, fb: 0 },
  { code: 'LEM', meal: 'snack', name: 'Lemon / lime juice', kcal: 5, p: 0, c: 1, f: 0, fb: 0 },
  { code: 'BAL', meal: 'snack', name: 'Balsamic vinegar (1 tbsp)', kcal: 14, p: 0, c: 3, f: 0, fb: 0 },
  { code: 'SAL', meal: 'snack', name: 'Salsa (2 tbsp)', kcal: 10, p: 0, c: 2, f: 0, fb: 0 },
]
