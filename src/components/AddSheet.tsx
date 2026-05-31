import { useState, useRef } from 'react'
import { MEALS, MENU } from '../lib/menu'
import { STAPLES, STAPLE_CATEGORIES, STAPLE_CATEGORY_COLORS } from '../lib/staples'
import { lookupBarcode, searchByName, type OFFResult } from '../lib/openfoodfacts'
import type { LogEntry, MealId, MyFood } from '../lib/types'
import type { Staple } from '../lib/staples'
import BarcodeScanner from './BarcodeScanner'

type NewEntry = Omit<LogEntry, 'id' | 'created_at' | 'date' | 'user_id'>
type Tab = 'menu' | 'staples' | 'recents' | 'custom' | 'find'
interface Pending { name: string; meal: MealId; basis: 'serving' | '100g'; per100: { kcal: number; p: number; c: number; f: number } }

export default function AddSheet({
  open, onClose, onAdd, myFoods, onSaveMyFood, onDeleteMyFood,
}: {
  open: boolean
  onClose: () => void
  onAdd: (e: NewEntry) => void
  myFoods: MyFood[]
  onSaveMyFood: (f: Omit<MyFood, 'id' | 'use_count' | 'last_used'>) => void
  onDeleteMyFood: (id: string) => void
}) {
  const [tab, setTab] = useState<Tab>('menu')
  const [customMeal, setCustomMeal] = useState<MealId>('breakfast')
  const [cf, setCf] = useState({ name: '', kcal: '', p: '', c: '', f: '' })
  const [pending, setPending] = useState<Pending | null>(null)
  const [grams, setGrams] = useState('100')
  const [scanMsg, setScanMsg] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<OFFResult[]>([])
  const [searching, setSearching] = useState(false)
  const [stapleFilter, setStapleFilter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() { setPending(null); setGrams('100'); setScanMsg(''); setPhotoLoading(false); setSearchQ(''); setSearchResults([]); setSearching(false); setStapleFilter('') }
  function close() { reset(); setTab('menu'); onClose() }

  function addMenu(code: string) {
    const m = MENU.find((x) => x.code === code)!
    onAdd({ meal: m.meal, name: m.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, qty: 1 })
  }

  function chooseMyFood(f: MyFood) {
    if (f.basis === '100g') {
      setPending({ name: f.name, meal: 'snack', basis: '100g', per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f } })
    } else {
      onAdd({ meal: 'snack', name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, qty: 1 })
      onSaveMyFood({ name: f.name, basis: 'serving', kcal: f.kcal, p: f.p, c: f.c, f: f.f })
      close()
    }
  }

  function chooseStaple(s: Staple) {
    if (s.basis === '100g') {
      setPending({ name: s.name, meal: 'snack', basis: '100g', per100: { kcal: s.kcal, p: s.p, c: s.c, f: s.f } })
    } else {
      onAdd({ meal: 'snack', name: s.name, kcal: s.kcal, p: s.p, c: s.c, f: s.f, qty: 1 })
      onSaveMyFood({ name: s.name, basis: 'serving', kcal: s.kcal, p: s.p, c: s.c, f: s.f })
      close()
    }
  }

  async function onBarcode(code: string) {
    setScanMsg('Looking up…')
    try {
      const r = await lookupBarcode(code)
      if (!r) { setScanMsg(`No match for ${code}. Add it as a custom food.`); return }
      setPending({ name: r.name, meal: 'snack', basis: '100g', per100: { kcal: r.kcal, p: r.p, c: r.c, f: r.f } })
    } catch {
      setScanMsg('Lookup failed (offline?). Try custom entry.')
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setScanMsg('')
    try {
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/parse-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 }),
      })
      const data = await res.json()
      if (data.error) { setScanMsg(data.error); setPhotoLoading(false); return }
      const basis = data.basis === 'serving' ? 'serving' as const : '100g' as const
      setPending({
        name: data.name || 'Scanned food',
        meal: 'snack',
        basis,
        per100: { kcal: Math.round(data.kcal || 0), p: +(data.p || 0), c: +(data.c || 0), f: +(data.f || 0) },
      })
    } catch {
      setScanMsg('Failed to parse label. Try custom entry.')
    }
    setPhotoLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onSearch() {
    const q = searchQ.trim()
    if (!q) return
    setSearching(true)
    setSearchResults([])
    try {
      const results = await searchByName(q)
      setSearchResults(results)
      if (!results.length) setScanMsg(`No results for "${q}".`)
    } catch {
      setScanMsg('Search failed (offline?).')
    }
    setSearching(false)
  }

  function confirmPending() {
    if (!pending) return
    if (pending.basis === 'serving') {
      onAdd({
        meal: pending.meal,
        name: pending.name,
        kcal: pending.per100.kcal,
        p: pending.per100.p,
        c: pending.per100.c,
        f: pending.per100.f,
        qty: 1,
      })
      onSaveMyFood({ name: pending.name, basis: 'serving', ...pending.per100 })
      close()
      return
    }
    const g = parseFloat(grams) || 0
    const k = g / 100
    const e = {
      meal: pending.meal,
      name: `${pending.name} (${g}g)`,
      kcal: Math.round(pending.per100.kcal * k),
      p: +(pending.per100.p * k).toFixed(1),
      c: +(pending.per100.c * k).toFixed(1),
      f: +(pending.per100.f * k).toFixed(1),
      qty: 1,
    }
    onAdd(e)
    onSaveMyFood({ name: pending.name, basis: '100g', ...pending.per100 })
    close()
  }

  function saveCustom() {
    const p = +cf.p || 0, c = +cf.c || 0, f = +cf.f || 0
    let kcal = +cf.kcal
    if (!kcal) kcal = p * 4 + c * 4 + f * 9
    const name = cf.name.trim() || 'Food'
    onAdd({ meal: customMeal, name, kcal, p, c, f, qty: 1 })
    onSaveMyFood({ name, basis: 'serving', kcal, p, c, f })
    setCf({ name: '', kcal: '', p: '', c: '', f: '' })
    close()
  }

  const tabs: [Tab, string][] = [['menu', 'Menu'], ['staples', 'Staples'], ['recents', 'My foods'], ['custom', 'Custom'], ['find', 'Find / Scan']]

  return (
    <>
      <div className={`fixed inset-0 bg-ink/50 transition-opacity z-40 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={close} />
      <div className={`fixed left-0 right-0 bottom-0 max-w-[480px] mx-auto bg-paper rounded-t-[22px] z-50 max-h-[86vh] flex flex-col transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-[42px] h-[5px] bg-line rounded-md mx-auto mt-2.5 mb-1" />
        <div className="flex px-4 gap-1">
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); reset() }}
              className={`flex-1 font-bold text-[.9rem] py-3 border-b-2 ${tab === t ? 'text-forest border-terra' : 'text-inksoft border-transparent'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-4 pt-3.5 pb-7">
          {pending ? (
            <div>
              <p className="font-display font-semibold text-lg">{pending.name}</p>
              <p className="text-[.8rem] text-inksoft mb-3">
                {pending.basis === '100g' ? 'Per 100g' : 'Per serving'}: {pending.per100.kcal} kcal · {pending.per100.p}P / {pending.per100.c}C / {pending.per100.f}F
              </p>
              {pending.basis === '100g' && (
                <>
                  <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Grams eaten</label>
                  <input type="number" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)}
                    className="w-full text-base px-3.5 py-3 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
                </>
              )}
              <MealPicker value={pending.meal} onChange={(meal) => setPending({ ...pending, meal })} />
              <button onClick={confirmPending} className="w-full mt-4 bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90">Add to log</button>
              <button onClick={reset} className="w-full mt-2 text-sm text-inksoft">Back</button>
            </div>
          ) : tab === 'menu' ? (
            MEALS.map((m) => {
              const items = MENU.filter((l) => l.meal === m.id)
              return (
                <div key={m.id} className="mb-3.5">
                  <p className="text-[.7rem] font-bold uppercase tracking-widest mb-1.5 ml-0.5" style={{ color: m.color }}>{m.name}</p>
                  {items.map((l) => (
                    <button key={l.code} onClick={() => addMenu(l.code)}
                      className="w-full flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5 text-left active:bg-white">
                      <span className="font-display font-semibold text-[.72rem] text-white px-1.5 py-0.5 rounded-md" style={{ background: m.color }}>{l.code}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[.92rem]">{l.name}</span>
                        <span className="block text-[.68rem] text-inksoft">{l.kcal} kcal · {l.p}P / {l.c}C / {l.f}F</span>
                      </span>
                      <span className="text-forest text-xl font-bold">＋</span>
                    </button>
                  ))}
                </div>
              )
            })
          ) : tab === 'staples' ? (
            <div>
              <input value={stapleFilter} onChange={(e) => setStapleFilter(e.target.value)} placeholder="Filter staples..."
                className="w-full text-base px-3.5 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra mb-3" />
              {STAPLE_CATEGORIES.map((cat) => {
                const items = STAPLES.filter((s) => s.category === cat && (!stapleFilter || s.name.toLowerCase().includes(stapleFilter.toLowerCase())))
                if (!items.length) return null
                return (
                  <div key={cat} className="mb-3.5">
                    <p className="text-[.7rem] font-bold uppercase tracking-widest mb-1.5 ml-0.5" style={{ color: STAPLE_CATEGORY_COLORS[cat] }}>{cat}</p>
                    {items.map((s) => (
                      <button key={s.name} onClick={() => chooseStaple(s)}
                        className="w-full flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5 text-left active:bg-white">
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-[.92rem]">{s.name}</span>
                          <span className="block text-[.68rem] text-inksoft">
                            {s.kcal} kcal {'\u00b7'} {s.p}P / {s.c}C / {s.f}F{s.basis === '100g' ? ' / 100g' : ''}
                            {s.hint && <>{' \u00b7 '}{s.hint}</>}
                          </span>
                        </span>
                        <span className="text-forest text-xl font-bold">{'\uff0b'}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ) : tab === 'recents' ? (
            myFoods.length ? myFoods.map((f) => (
              <div key={f.id} className="flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5">
                <button onClick={() => chooseMyFood(f)} className="flex-1 min-w-0 text-left">
                  <span className="block font-semibold text-[.92rem]">{f.name}</span>
                  <span className="block text-[.68rem] text-inksoft">
                    {f.kcal} kcal · {f.p}P / {f.c}C / {f.f}F {f.basis === '100g' ? '/ 100g' : ''} · used {f.use_count}×
                  </span>
                </button>
                <button onClick={() => onDeleteMyFood(f.id)} className="text-macp/40 active:text-macp px-1">✕</button>
              </div>
            )) : <p className="text-center text-inksoft italic py-10 text-sm">No saved foods yet. Custom entries and scans land here automatically.</p>
          ) : tab === 'custom' ? (
            <div>
              <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Which meal?</label>
              <MealPicker value={customMeal} onChange={setCustomMeal} />
              <label className="block text-[.74rem] font-bold uppercase text-inksoft mt-3 mb-1.5">Food name</label>
              <input value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} placeholder="e.g. Cottage cheese"
                className="w-full text-base px-3.5 py-3 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
              <div className="grid grid-cols-4 gap-2 mt-3">
                {(['kcal', 'p', 'c', 'f'] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-[.7rem] font-bold uppercase text-inksoft mb-1">{k === 'p' ? 'Prot' : k === 'c' ? 'Carb' : k === 'f' ? 'Fat' : 'Kcal'}</label>
                    <input type="number" inputMode="numeric" value={cf[k]} onChange={(e) => setCf({ ...cf, [k]: e.target.value })} placeholder="0"
                      className="w-full text-base px-2.5 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
                  </div>
                ))}
              </div>
              <button onClick={saveCustom} className="w-full mt-4 bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90">Add to log</button>
              <p className="text-[.74rem] text-inksoft italic mt-2 text-center">Leave kcal blank to estimate from macros (4/4/9).</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo label */}
              <div>
                <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Snap a nutrition label</label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={photoLoading}
                  className="w-full flex items-center justify-center gap-2 bg-forest text-white font-bold py-3 rounded-xl active:opacity-90 disabled:opacity-50">
                  {photoLoading ? 'Reading label…' : '📷 Snap label'}
                </button>
              </div>

              {/* Text search */}
              <div>
                <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Search Open Food Facts</label>
                <form onSubmit={(ev) => { ev.preventDefault(); onSearch() }} className="flex gap-2">
                  <input value={searchQ} onChange={(ev) => setSearchQ(ev.target.value)} placeholder="e.g. skyr vanilla"
                    className="flex-1 text-base px-3.5 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
                  <button type="submit" disabled={searching || !searchQ.trim()}
                    className="bg-terra text-white font-bold px-4 rounded-[10px] active:opacity-90 disabled:opacity-50">
                    {searching ? '…' : 'Search'}
                  </button>
                </form>
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {searchResults.map((r, i) => (
                      <button key={i} onClick={() => setPending({ name: r.name, meal: 'snack', basis: '100g', per100: { kcal: r.kcal, p: r.p, c: r.c, f: r.f } })}
                        className="w-full flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 text-left active:bg-white">
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-[.92rem] truncate">{r.name}</span>
                          <span className="block text-[.68rem] text-inksoft">{r.kcal} kcal · {r.p}P / {r.c}C / {r.f}F / 100g</span>
                        </span>
                        <span className="text-forest text-xl font-bold">＋</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Barcode scanner */}
              <div>
                <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Or scan a barcode</label>
                <BarcodeScanner onDetected={onBarcode} onClose={() => setTab('menu')} />
              </div>

              {scanMsg && <p className="text-center text-terra text-sm mt-2">{scanMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function MealPicker({ value, onChange }: { value: MealId; onChange: (m: MealId) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap mt-1">
      {MEALS.map((m) => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`rounded-full px-3 py-1.5 text-[.78rem] font-bold border ${value === m.id ? 'text-white border-transparent' : 'text-inksoft border-line bg-white'}`}
          style={value === m.id ? { background: m.color } : undefined}>
          {m.name}
        </button>
      ))}
    </div>
  )
}
