// Open Food Facts barcode lookup. Free, no key, strong EU coverage.
// Returns macros per 100g (OFF's native basis).
export interface OFFResult {
  name: string
  kcal: number
  p: number
  c: number
  f: number
  basis: '100g'
}

export async function lookupBarcode(barcode: string): Promise<OFFResult | null> {
  const fields = 'product_name,brands,nutriments'
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`,
  )
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null
  const n = data.product.nutriments || {}
  const name = [data.product.brands, data.product.product_name].filter(Boolean).join(' ').trim() || `Item ${barcode}`
  const kcal = num(n['energy-kcal_100g']) || Math.round(num(n['energy_100g']) / 4.184)
  return {
    name,
    kcal: Math.round(kcal),
    p: round1(num(n['proteins_100g'])),
    c: round1(num(n['carbohydrates_100g'])),
    f: round1(num(n['fat_100g'])),
    basis: '100g',
  }
}

export async function searchByName(query: string): Promise<OFFResult[]> {
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments`,
  )
  if (!res.ok) return []
  const data = await res.json()
  const products: OFFResult[] = []
  for (const p of data.products ?? []) {
    const n = p.nutriments || {}
    const name = [p.brands, p.product_name].filter(Boolean).join(' ').trim()
    if (!name) continue
    const kcal = num(n['energy-kcal_100g']) || Math.round(num(n['energy_100g']) / 4.184)
    products.push({
      name,
      kcal: Math.round(kcal),
      p: round1(num(n['proteins_100g'])),
      c: round1(num(n['carbohydrates_100g'])),
      f: round1(num(n['fat_100g'])),
      basis: '100g',
    })
  }
  return products
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number { return Math.round(n * 10) / 10 }
