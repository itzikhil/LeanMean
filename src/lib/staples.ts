export interface Staple {
  name: string
  category: 'Protein' | 'Eggs & Dairy' | 'Carbs' | 'Fruit & Veg' | 'Fats & Extras'
  basis: '100g' | 'serving'
  hint?: string
  kcal: number; p: number; c: number; f: number
}

export const STAPLE_CATEGORIES = ['Protein', 'Eggs & Dairy', 'Carbs', 'Fruit & Veg', 'Fats & Extras'] as const

export const STAPLE_CATEGORY_COLORS: Record<string, string> = {
  'Protein': '#9c3d52',
  'Eggs & Dairy': '#b88a2e',
  'Carbs': '#c0623a',
  'Fruit & Veg': '#3f7a4f',
  'Fats & Extras': '#3a5a7a',
}

export const STAPLES: Staple[] = [
  // ---- Protein (raw, per 100g) ----
  { name: 'Chicken breast (raw)', category: 'Protein', basis: '100g', kcal: 120, p: 23, c: 0, f: 2.6 },
  { name: 'Chicken thigh, boneless skinless (raw)', category: 'Protein', basis: '100g', kcal: 145, p: 19, c: 0, f: 7.5 },
  { name: 'Beef mince 5% (raw)', category: 'Protein', basis: '100g', kcal: 149, p: 21, c: 0, f: 5 },
  { name: 'Salmon fillet (raw)', category: 'Protein', basis: '100g', kcal: 208, p: 20, c: 0, f: 13 },
  { name: 'White fish / cod (raw)', category: 'Protein', basis: '100g', kcal: 82, p: 18, c: 0, f: 0.7 },
  { name: 'Tuna, canned in water (drained)', category: 'Protein', basis: '100g', kcal: 116, p: 26, c: 0, f: 1 },
  { name: 'Turkey ham', category: 'Protein', basis: '100g', kcal: 88, p: 19.5, c: 0.5, f: 0.9 },

  // ---- Eggs & Dairy ----
  { name: 'Whole egg', category: 'Eggs & Dairy', basis: 'serving', hint: '1 large \u2248 50g', kcal: 72, p: 6.3, c: 0.4, f: 4.8 },
  { name: 'Egg white', category: 'Eggs & Dairy', basis: '100g', hint: '1 white \u2248 33g', kcal: 52, p: 11, c: 0.7, f: 0.2 },
  { name: 'Skyr 0%', category: 'Eggs & Dairy', basis: '100g', kcal: 63, p: 11, c: 4, f: 0.2 },
  { name: 'Greek yogurt 0%', category: 'Eggs & Dairy', basis: '100g', kcal: 59, p: 10, c: 3.6, f: 0.4 },
  { name: 'Cottage cheese, low-fat', category: 'Eggs & Dairy', basis: '100g', kcal: 72, p: 12, c: 3, f: 1.5 },
  { name: 'Protein milk', category: 'Eggs & Dairy', basis: '100g', hint: 'per 100ml, varies by brand', kcal: 55, p: 7, c: 5.5, f: 0.5 },
  { name: 'Mini Babybel', category: 'Eggs & Dairy', basis: 'serving', hint: '1 piece \u2248 20g', kcal: 48, p: 5.2, c: 0.1, f: 3.1 },
  { name: 'Cheddar (block)', category: 'Eggs & Dairy', basis: '100g', kcal: 400, p: 25, c: 0.1, f: 33 },
  { name: 'Mozzarella', category: 'Eggs & Dairy', basis: '100g', kcal: 250, p: 22, c: 2, f: 17 },

  // ---- Carbs ----
  { name: 'White rice (dry)', category: 'Carbs', basis: '100g', hint: 'dry; \u2248 \u00d72.7 cooked', kcal: 360, p: 7, c: 79, f: 0.6 },
  { name: 'White rice (cooked)', category: 'Carbs', basis: '100g', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { name: 'Potato (raw)', category: 'Carbs', basis: '100g', kcal: 77, p: 2, c: 17, f: 0.1 },
  { name: 'Sweet potato (raw)', category: 'Carbs', basis: '100g', kcal: 86, p: 1.6, c: 20, f: 0.1 },
  { name: 'Oats (dry)', category: 'Carbs', basis: '100g', kcal: 379, p: 13, c: 67, f: 7 },
  { name: 'Pasta (dry)', category: 'Carbs', basis: '100g', kcal: 360, p: 12, c: 72, f: 1.5 },
  { name: 'Bread', category: 'Carbs', basis: 'serving', hint: '1 slice \u2248 40g', kcal: 100, p: 4, c: 18, f: 1 },
  { name: 'Rice cake', category: 'Carbs', basis: 'serving', hint: '1 cake \u2248 9g', kcal: 35, p: 0.7, c: 7.2, f: 0.2 },

  // ---- Fruit & Veg ----
  { name: 'Banana', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium \u2248 118g', kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: 'Apple', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium \u2248 180g', kcal: 95, p: 0.5, c: 25, f: 0.3 },
  { name: 'Berries (mixed)', category: 'Fruit & Veg', basis: '100g', kcal: 50, p: 1, c: 11, f: 0.3 },
  { name: 'Avocado', category: 'Fruit & Veg', basis: '100g', hint: 'half \u2248 100g', kcal: 160, p: 2, c: 9, f: 15 },
  { name: 'Broccoli', category: 'Fruit & Veg', basis: '100g', kcal: 34, p: 2.8, c: 7, f: 0.4 },
  { name: 'Mixed green veg', category: 'Fruit & Veg', basis: '100g', kcal: 30, p: 2, c: 4, f: 0.4 },

  // ---- Fats & Extras ----
  { name: 'Whey protein powder', category: 'Fats & Extras', basis: 'serving', hint: '1 scoop \u2248 30g', kcal: 120, p: 24, c: 3, f: 1.5 },
  { name: 'Peanut butter powder', category: 'Fats & Extras', basis: 'serving', hint: '\u2248 12g', kcal: 45, p: 5, c: 4, f: 1.5 },
  { name: 'Olive oil', category: 'Fats & Extras', basis: 'serving', hint: '1 tbsp \u2248 14g', kcal: 120, p: 0, c: 0, f: 14 },
  { name: 'Peanut butter', category: 'Fats & Extras', basis: 'serving', hint: '1 tbsp \u2248 16g', kcal: 95, p: 4, c: 3, f: 8 },
  { name: 'Almonds', category: 'Fats & Extras', basis: '100g', hint: '\u2248 23 nuts', kcal: 580, p: 21, c: 22, f: 50 },
]
