export interface Staple {
  name: string
  category: 'Protein' | 'Eggs & Dairy' | 'Carbs' | 'Fruit & Veg' | 'Fats & Extras'
  basis: '100g' | 'serving'
  hint?: string
  cookedFactor?: number  // cooked weight ÷ raw weight
  kcal: number; p: number; c: number; f: number; fb: number
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
  { name: 'Chicken breast (raw)', category: 'Protein', basis: '100g', cookedFactor: 0.75, kcal: 120, p: 23, c: 0, f: 2.6, fb: 0 },
  { name: 'Chicken thigh, boneless skinless (raw)', category: 'Protein', basis: '100g', cookedFactor: 0.75, kcal: 145, p: 19, c: 0, f: 7.5, fb: 0 },
  { name: 'Beef mince 5% (raw)', category: 'Protein', basis: '100g', cookedFactor: 0.7, kcal: 149, p: 21, c: 0, f: 5, fb: 0 },
  { name: 'Salmon fillet (raw)', category: 'Protein', basis: '100g', cookedFactor: 0.75, kcal: 208, p: 20, c: 0, f: 13, fb: 0 },
  { name: 'White fish / cod (raw)', category: 'Protein', basis: '100g', kcal: 82, p: 18, c: 0, f: 0.7, fb: 0 },
  { name: 'Tuna, canned in water (drained)', category: 'Protein', basis: '100g', kcal: 116, p: 26, c: 0, f: 1, fb: 0 },
  { name: 'Turkey ham', category: 'Protein', basis: '100g', kcal: 88, p: 19.5, c: 0.5, f: 0.9, fb: 0 },

  // ---- Eggs & Dairy ----
  { name: 'Whole egg', category: 'Eggs & Dairy', basis: 'serving', hint: '1 large \u2248 50g', kcal: 72, p: 6.3, c: 0.4, f: 4.8, fb: 0 },
  { name: 'Egg white', category: 'Eggs & Dairy', basis: '100g', hint: '1 white \u2248 33g', kcal: 52, p: 11, c: 0.7, f: 0.2, fb: 0 },
  { name: 'Skyr 0%', category: 'Eggs & Dairy', basis: '100g', kcal: 63, p: 11, c: 4, f: 0.2, fb: 0 },
  { name: 'Greek yogurt 0%', category: 'Eggs & Dairy', basis: '100g', kcal: 59, p: 10, c: 3.6, f: 0.4, fb: 0 },
  { name: 'Cottage cheese, low-fat', category: 'Eggs & Dairy', basis: '100g', kcal: 72, p: 12, c: 3, f: 1.5, fb: 0 },
  { name: 'Protein milk', category: 'Eggs & Dairy', basis: '100g', hint: 'per 100ml, varies by brand', kcal: 55, p: 7, c: 5.5, f: 0.5, fb: 0 },
  { name: 'Mini Babybel', category: 'Eggs & Dairy', basis: 'serving', hint: '1 piece \u2248 20g', kcal: 48, p: 5.2, c: 0.1, f: 3.1, fb: 0 },
  { name: 'Cheddar (block)', category: 'Eggs & Dairy', basis: '100g', kcal: 400, p: 25, c: 0.1, f: 33, fb: 0 },
  { name: 'Mozzarella', category: 'Eggs & Dairy', basis: '100g', kcal: 250, p: 22, c: 2, f: 17, fb: 0 },

  // ---- Carbs ----
  { name: 'White rice (dry)', category: 'Carbs', basis: '100g', cookedFactor: 2.7, hint: 'dry; \u2248 \u00d72.7 cooked', kcal: 360, p: 7, c: 79, f: 0.6, fb: 1.3 },
  { name: 'White rice (cooked)', category: 'Carbs', basis: '100g', kcal: 130, p: 2.7, c: 28, f: 0.3, fb: 0 },
  { name: 'Potato (raw)', category: 'Carbs', basis: '100g', cookedFactor: 0.9, kcal: 77, p: 2, c: 17, f: 0.1, fb: 2.2 },
  { name: 'Sweet potato (raw)', category: 'Carbs', basis: '100g', cookedFactor: 0.9, kcal: 86, p: 1.6, c: 20, f: 0.1, fb: 3 },
  { name: 'Oats (dry)', category: 'Carbs', basis: '100g', cookedFactor: 3.0, kcal: 379, p: 13, c: 67, f: 7, fb: 10 },
  { name: 'Pasta (dry)', category: 'Carbs', basis: '100g', cookedFactor: 2.3, kcal: 360, p: 12, c: 72, f: 1.5, fb: 3 },
  { name: 'Bread', category: 'Carbs', basis: 'serving', hint: '1 slice \u2248 40g', kcal: 100, p: 4, c: 18, f: 1, fb: 2 },
  { name: 'Rice cake', category: 'Carbs', basis: 'serving', hint: '1 cake \u2248 9g', kcal: 35, p: 0.7, c: 7.2, f: 0.2, fb: 0 },

  // ---- Fruit & Veg ----
  { name: 'Banana', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium \u2248 118g', kcal: 105, p: 1.3, c: 27, f: 0.4, fb: 3.1 },
  { name: 'Apple', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium \u2248 180g', kcal: 95, p: 0.5, c: 25, f: 0.3, fb: 4.4 },
  { name: 'Berries (mixed)', category: 'Fruit & Veg', basis: '100g', kcal: 50, p: 1, c: 11, f: 0.3, fb: 3 },
  { name: 'Avocado', category: 'Fruit & Veg', basis: '100g', hint: 'half \u2248 100g', kcal: 160, p: 2, c: 9, f: 15, fb: 7 },
  { name: 'Broccoli', category: 'Fruit & Veg', basis: '100g', kcal: 34, p: 2.8, c: 7, f: 0.4, fb: 2.6 },
  { name: 'Mixed green veg', category: 'Fruit & Veg', basis: '100g', kcal: 30, p: 2, c: 4, f: 0.4, fb: 2 },
  // ---- Fruit ----
  { name: 'Orange', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium ≈ 130g', kcal: 62, p: 1.2, c: 15, f: 0.2, fb: 3.1 },
  { name: 'Pear', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium ≈ 178g', kcal: 101, p: 0.6, c: 27, f: 0.2, fb: 5.5 },
  { name: 'Kiwi', category: 'Fruit & Veg', basis: 'serving', hint: '1 fruit ≈ 70g', kcal: 42, p: 0.8, c: 10, f: 0.4, fb: 2.1 },
  { name: 'Clementine', category: 'Fruit & Veg', basis: 'serving', hint: '1 fruit ≈ 74g', kcal: 35, p: 0.6, c: 9, f: 0.1, fb: 1.3 },
  { name: 'Peach', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium ≈ 150g', kcal: 59, p: 1.4, c: 14, f: 0.4, fb: 2.3 },
  { name: 'Nectarine', category: 'Fruit & Veg', basis: 'serving', hint: '1 medium ≈ 142g', kcal: 63, p: 1.5, c: 15, f: 0.5, fb: 2.2 },
  { name: 'Grapes', category: 'Fruit & Veg', basis: '100g', kcal: 69, p: 0.7, c: 18, f: 0.2, fb: 0.9 },
  { name: 'Strawberries', category: 'Fruit & Veg', basis: '100g', kcal: 32, p: 0.7, c: 8, f: 0.3, fb: 2 },
  { name: 'Blueberries', category: 'Fruit & Veg', basis: '100g', kcal: 57, p: 0.7, c: 14, f: 0.3, fb: 2.4 },
  { name: 'Raspberries', category: 'Fruit & Veg', basis: '100g', kcal: 52, p: 1.2, c: 12, f: 0.7, fb: 6.5 },
  { name: 'Mango', category: 'Fruit & Veg', basis: '100g', kcal: 60, p: 0.8, c: 15, f: 0.4, fb: 1.6 },
  { name: 'Pineapple', category: 'Fruit & Veg', basis: '100g', kcal: 50, p: 0.5, c: 13, f: 0.1, fb: 1.4 },
  { name: 'Watermelon', category: 'Fruit & Veg', basis: '100g', kcal: 30, p: 0.6, c: 8, f: 0.2, fb: 0.4 },
  // ---- Veg ----
  { name: 'Spinach', category: 'Fruit & Veg', basis: '100g', kcal: 23, p: 2.9, c: 3.6, f: 0.4, fb: 2.2 },
  { name: 'Tomato', category: 'Fruit & Veg', basis: '100g', kcal: 18, p: 0.9, c: 3.9, f: 0.2, fb: 1.2 },
  { name: 'Cucumber', category: 'Fruit & Veg', basis: '100g', kcal: 15, p: 0.7, c: 3.6, f: 0.1, fb: 0.5 },
  { name: 'Bell pepper', category: 'Fruit & Veg', basis: '100g', kcal: 31, p: 1, c: 6, f: 0.3, fb: 1.7 },
  { name: 'Carrot', category: 'Fruit & Veg', basis: '100g', kcal: 41, p: 0.9, c: 10, f: 0.2, fb: 2.8 },
  { name: 'Zucchini', category: 'Fruit & Veg', basis: '100g', kcal: 17, p: 1.2, c: 3.1, f: 0.3, fb: 1 },
  { name: 'Cauliflower', category: 'Fruit & Veg', basis: '100g', kcal: 25, p: 1.9, c: 5, f: 0.3, fb: 2 },
  { name: 'Green beans', category: 'Fruit & Veg', basis: '100g', kcal: 31, p: 1.8, c: 7, f: 0.1, fb: 2.7 },
  { name: 'Lettuce', category: 'Fruit & Veg', basis: '100g', kcal: 15, p: 1.4, c: 2.9, f: 0.2, fb: 1.3 },
  { name: 'Onion', category: 'Fruit & Veg', basis: '100g', kcal: 40, p: 1.1, c: 9, f: 0.1, fb: 1.7 },
  { name: 'Mushrooms', category: 'Fruit & Veg', basis: '100g', kcal: 22, p: 3.1, c: 3.3, f: 0.3, fb: 1 },

  // ---- Fats & Extras ----
  { name: 'Whey protein powder', category: 'Fats & Extras', basis: 'serving', hint: '1 scoop \u2248 30g', kcal: 120, p: 24, c: 3, f: 1.5, fb: 0 },
  { name: 'Peanut butter powder', category: 'Fats & Extras', basis: 'serving', hint: '\u2248 12g', kcal: 45, p: 5, c: 4, f: 1.5, fb: 0 },
  { name: 'Olive oil', category: 'Fats & Extras', basis: 'serving', hint: '1 tbsp \u2248 14g', kcal: 120, p: 0, c: 0, f: 14, fb: 0 },
  { name: 'Peanut butter', category: 'Fats & Extras', basis: 'serving', hint: '1 tbsp \u2248 16g', kcal: 95, p: 4, c: 3, f: 8, fb: 1 },
  { name: 'Almonds', category: 'Fats & Extras', basis: '100g', hint: '\u2248 23 nuts', kcal: 580, p: 21, c: 22, f: 50, fb: 12.5 },
]

/** Keyword → cookedFactor lookup for matching scanned/parsed items to known factors. */
const COOKED_KEYWORDS: [RegExp, number][] = [
  [/chicken/i, 0.75],
  [/turkey/i, 0.75],
  [/beef|mince/i, 0.7],
  [/salmon/i, 0.75],
  [/\brice\b/i, 2.7],
  [/pasta|spaghetti|penne|fusilli/i, 2.3],
  [/\boats\b|oatmeal|porridge/i, 3.0],
  [/\bpotato\b/i, 0.9],
  [/sweet\s*potato/i, 0.9],
]

/** Match a food name against known cooked factors. Returns the factor or undefined. */
export function matchCookedFactor(name: string): number | undefined {
  for (const [re, factor] of COOKED_KEYWORDS) {
    if (re.test(name)) return factor
  }
  return undefined
}
