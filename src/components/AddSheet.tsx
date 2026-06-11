import { useState, useEffect, useRef } from 'react'
import { MEALS, MENU } from '../lib/menu'
import { STAPLES, STAPLE_CATEGORIES, STAPLE_CATEGORY_COLORS, matchCookedFactor } from '../lib/staples'
import { lookupBarcode, searchByName, type OFFResult } from '../lib/openfoodfacts'
import { resizeImage } from '../lib/resizeImage'
import { authFetch } from '../lib/api'
import type { LogEntry, MealId, MyFood, SavedMeal, SavedMealItem, Targets } from '../lib/types'
import type { Staple } from '../lib/staples'
import BarcodeScanner from './BarcodeScanner'

type NewEntry = Omit<LogEntry, 'id' | 'created_at' | 'date' | 'user_id'>

/** Food quality badges: "protein" when ≥10g P per 100 kcal, "fiber" when ≥3g FB per 100 kcal. */
function qualityBadges(kcal: number, p: number, fb: number, lowP: boolean, lowFb: boolean) {
  if (kcal <= 0) return null
  const highP = (p / kcal) * 100 >= 10
  const highFb = (fb / kcal) * 100 >= 3
  if (!highP && !highFb) return null
  return (
    <span className="inline-flex gap-1 ml-1">
      {highP && <span className={`text-[.58rem] font-bold px-1 py-0.5 rounded ${lowP ? 'bg-macp/20 text-macp' : 'bg-paper2 text-inksoft/50'}`}>protein</span>}
      {highFb && <span className={`text-[.58rem] font-bold px-1 py-0.5 rounded ${lowFb ? 'bg-[#8B7355]/20 text-[#8B7355]' : 'bg-paper2 text-inksoft/50'}`}>fiber</span>}
    </span>
  )
}
type Tab = 'menu' | 'staples' | 'recents' | 'custom' | 'find' | 'ai'
interface Pending { name: string; meal: MealId; basis: 'serving' | '100g'; per100: { kcal: number; p: number; c: number; f: number; fb: number }; cookedFactor?: number }
interface ParsedItem { name: string; kcal: number; p: number; c: number; f: number; fb: number; qty: number; meal: MealId; estimated?: boolean; cookedFactor?: number; weighMode?: 'raw' | 'cooked' }

export default function AddSheet({
  open, onClose, onAdd, onAddMultiple, myFoods, onSaveMyFood, onDeleteMyFood, savedMeals, onDeleteSavedMeal, onAddSavedMeal, totals, targets,
}: {
  open: boolean
  onClose: () => void
  onAdd: (e: NewEntry) => Promise<void> | void
  onAddMultiple: (entries: NewEntry[]) => Promise<void>
  myFoods: MyFood[]
  onSaveMyFood: (f: Omit<MyFood, 'id' | 'use_count' | 'last_used'>) => void
  onDeleteMyFood: (id: string) => void
  savedMeals: SavedMeal[]
  onDeleteSavedMeal: (id: string) => void
  onAddSavedMeal: (meal: MealId, items: SavedMealItem[]) => void
  totals: { kcal: number; p: number; fb: number }
  targets: Targets
}) {
  const lowP = totals.p < targets.p * 0.8
  const lowFb = totals.fb < targets.fb * 0.8
  const [tab, setTab] = useState<Tab>('menu')
  const [customMeal, setCustomMeal] = useState<MealId>('breakfast')
  const [cf, setCf] = useState({ name: '', kcal: '', p: '', c: '', f: '', fb: '' })
  const [pending, setPending] = useState<Pending | null>(null)
  const [grams, setGrams] = useState('100')
  const [servings, setServings] = useState('1')
  const [weighMode, setWeighMode] = useState<'raw' | 'cooked'>('raw')
  const [scanMsg, setScanMsg] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<OFFResult[]>([])
  const [searching, setSearching] = useState(false)
  const [stapleFilter, setStapleFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [pendingSaved, setPendingSaved] = useState<SavedMeal | null>(null)
  const [savedMealSlot, setSavedMealSlot] = useState<MealId>('breakfast')
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiItems, setAiItems] = useState<ParsedItem[]>([])
  const [kbOffset, setKbOffset] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const plateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function onVVChange() {
      setKbOffset(Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop))
    }
    vv.addEventListener('resize', onVVChange)
    vv.addEventListener('scroll', onVVChange)
    return () => { vv.removeEventListener('resize', onVVChange); vv.removeEventListener('scroll', onVVChange) }
  }, [])

  function reset() { setPending(null); setPendingSaved(null); setGrams('100'); setServings('1'); setWeighMode('raw'); setAddError(null); setScanMsg(''); setPhotoLoading(false); setSearchQ(''); setSearchResults([]); setSearching(false); setStapleFilter(''); setAiText(''); setAiError(null); setAiItems([]); setAiLoading(false) }
  function close() { reset(); setTab('menu'); onClose() }

  function addMenu(code: string) {
    const m = MENU.find((x) => x.code === code)!
    onAdd({ meal: m.meal, name: m.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, fb: m.fb, qty: 1 })
  }

  function chooseMyFood(f: MyFood) {
    if (f.basis === '100g') {
      setPending({ name: f.name, meal: 'snack', basis: '100g', per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, fb: f.fb ?? 0 } })
    } else {
      onAdd({ meal: 'snack', name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, fb: f.fb ?? 0, qty: 1 })
      onSaveMyFood({ name: f.name, basis: 'serving', kcal: f.kcal, p: f.p, c: f.c, f: f.f, fb: f.fb ?? 0 })
      close()
    }
  }

  function chooseStaple(s: Staple) {
    setPending({ name: s.name, meal: 'snack', basis: s.basis, per100: { kcal: s.kcal, p: s.p, c: s.c, f: s.f, fb: s.fb }, cookedFactor: s.cookedFactor })
  }

  async function onBarcode(code: string) {
    setScanMsg('Looking up…')
    try {
      const r = await lookupBarcode(code)
      if (!r) { setScanMsg(`No match for ${code}. Add it as a custom food.`); return }
      setPending({ name: r.name, meal: 'snack', basis: '100g', per100: { kcal: r.kcal, p: r.p, c: r.c, f: r.f, fb: r.fb }, cookedFactor: matchCookedFactor(r.name) })
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
      let b64: string
      try {
        b64 = await resizeImage(file, 1024, 0.8)
      } catch (resizeErr) {
        const msg = resizeErr instanceof Error ? resizeErr.message : 'Unknown resize error'
        setScanMsg(`Image processing failed: ${msg}. Try a different photo or add manually.`)
        setPhotoLoading(false)
        if (fileRef.current) fileRef.current.value = ''
        return
      }
      if (b64.length > 4_000_000) {
        setScanMsg('Image still too large after compression. Try taking a closer/simpler photo.')
        setPhotoLoading(false)
        if (fileRef.current) fileRef.current.value = ''
        return
      }
      const data = await authFetch<{ name?: string; basis?: string; kcal?: number; p?: number; c?: number; f?: number; fb?: number }>('/api/parse-label', { image: b64 })
      const basis = data.basis === 'serving' ? 'serving' as const : '100g' as const
      const scanName = data.name || 'Scanned food'
      setPending({
        name: scanName,
        meal: 'snack',
        basis,
        per100: { kcal: Math.round(data.kcal || 0), p: +(data.p || 0), c: +(data.c || 0), f: +(data.f || 0), fb: +(data.fb || 0) },
        cookedFactor: matchCookedFactor(scanName),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setScanMsg(`Label scan failed: ${msg}`)
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

  async function confirmPending() {
    if (!pending) return
    setAddError(null)
    setAdding(true)
    try {
      if (pending.basis === 'serving') {
        const qty = Math.max(0.5, parseFloat(servings) || 1)
        await onAdd({ meal: pending.meal, name: pending.name, kcal: pending.per100.kcal, p: pending.per100.p, c: pending.per100.c, f: pending.per100.f, fb: pending.per100.fb, qty })
        onSaveMyFood({ name: pending.name, basis: 'serving', ...pending.per100 })
        close()
        return
      }
      const g = parseFloat(grams) || 0
      const rawG = weighMode === 'cooked' && pending.cookedFactor ? g / pending.cookedFactor : g
      const k = rawG / 100
      const label = weighMode === 'cooked' ? `${g}g cooked` : `${g}g`
      await onAdd({
        meal: pending.meal,
        name: `${pending.name} (${label})`,
        kcal: Math.round(pending.per100.kcal * k),
        p: +(pending.per100.p * k).toFixed(1),
        c: +(pending.per100.c * k).toFixed(1),
        f: +(pending.per100.f * k).toFixed(1),
        fb: +(pending.per100.fb * k).toFixed(1),
        qty: 1,
      })
      onSaveMyFood({ name: pending.name, basis: '100g', ...pending.per100 })
      close()
    } catch (err) {
      console.error('[AddSheet] confirmPending failed:', err)
      setAddError('Could not save — check your connection and try again.')
    } finally {
      setAdding(false)
    }
  }

  function saveCustom() {
    const p = +cf.p || 0, c = +cf.c || 0, f = +cf.f || 0, fb = +cf.fb || 0
    let kcal = +cf.kcal
    if (!kcal) kcal = p * 4 + c * 4 + f * 9
    const name = cf.name.trim() || 'Food'
    onAdd({ meal: customMeal, name, kcal, p, c, f, fb, qty: 1 })
    onSaveMyFood({ name, basis: 'serving', kcal, p, c, f, fb })
    setCf({ name: '', kcal: '', p: '', c: '', f: '', fb: '' })
    close()
  }

  function knownFoodsContext() {
    const menuStr = MENU.map((m) => `${m.name}: ${m.kcal}kcal ${m.p}P/${m.c}C/${m.f}F/${m.fb}FB (meal: ${m.meal})`).join('\n')
    const stapleStr = STAPLES.map((s) => `${s.name}: ${s.kcal}kcal ${s.p}P/${s.c}C/${s.f}F/${s.fb}FB per ${s.basis}`).join('\n')
    return `MENU ITEMS:\n${menuStr}\n\nSTAPLES:\n${stapleStr}`
  }

  async function onDescribe() {
    const text = aiText.trim()
    if (!text) return
    setAiLoading(true)
    setAiError(null)
    setAiItems([])
    try {
      const data = await authFetch<{ items?: ParsedItem[] }>('/api/parse-meal', { text, knownFoods: knownFoodsContext() })
      if (!data.items?.length) { setAiError('Could not parse any food items. Try rephrasing.'); return }
      setAiItems(data.items.map((it) => ({ ...it, cookedFactor: matchCookedFactor(it.name) })))
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to parse meal')
    } finally {
      setAiLoading(false)
    }
  }

  async function onPlatePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAiLoading(true)
    setAiError(null)
    setAiItems([])
    try {
      let b64: string
      try {
        b64 = await resizeImage(file, 1024, 0.8)
      } catch (resizeErr) {
        const msg = resizeErr instanceof Error ? resizeErr.message : 'Unknown resize error'
        setAiError(`Image processing failed: ${msg}. Try a different photo.`)
        return
      }
      if (b64.length > 4_000_000) {
        setAiError('Image still too large after compression. Try a simpler photo.')
        return
      }
      const data = await authFetch<{ items?: ParsedItem[] }>('/api/parse-plate', { image: b64, knownFoods: knownFoodsContext() })
      if (!data.items?.length) { setAiError('Could not identify food in the photo. Try again or enter manually.'); return }
      setAiItems(data.items.map((it) => ({ ...it, cookedFactor: matchCookedFactor(it.name) })))
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Photo analysis failed')
    } finally {
      setAiLoading(false)
      if (plateRef.current) plateRef.current.value = ''
    }
  }

  function removeAiItem(idx: number) {
    setAiItems(aiItems.filter((_, i) => i !== idx))
  }

  function updateAiItem(idx: number, field: keyof ParsedItem, value: string | number) {
    setAiItems(aiItems.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function confirmAiItems() {
    if (!aiItems.length) return
    setAdding(true)
    setAiError(null)
    try {
      const entries: NewEntry[] = aiItems.map((item) => ({
        meal: item.meal,
        name: item.name,
        kcal: Math.round(+item.kcal),
        p: +Number(item.p).toFixed(1),
        c: +Number(item.c).toFixed(1),
        f: +Number(item.f).toFixed(1),
        fb: +Number(item.fb ?? 0).toFixed(1),
        qty: item.qty || 1,
      }))
      await onAddMultiple(entries)
      // Save each AI-parsed item to My Foods for future one-tap re-logging
      for (const item of entries) {
        onSaveMyFood({ name: item.name, basis: 'serving', kcal: item.kcal, p: item.p, c: item.c, f: item.f, fb: item.fb ?? 0 })
      }
      close()
    } catch {
      setAiError('Could not save — check your connection and try again.')
    } finally {
      setAdding(false)
    }
  }

  const tabs: [Tab, string][] = [['menu', 'Menu'], ['staples', 'Staples'], ['recents', 'My foods'], ['custom', 'Custom'], ['find', 'Find / Scan'], ['ai', 'AI']]

  return (
    <>
      <div className={`fixed inset-0 bg-ink/50 transition-opacity z-40 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={close} />
      <div
        className={`fixed left-0 right-0 max-w-[480px] mx-auto bg-paper rounded-t-[22px] z-50 max-h-[86vh] flex flex-col transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ bottom: kbOffset, maxHeight: kbOffset > 0 ? `${window.innerHeight - kbOffset - 16}px` : undefined }}
      >
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
                {pending.basis === '100g'
                  ? weighMode === 'cooked' && pending.cookedFactor
                    ? `Per 100g cooked: ${Math.round(pending.per100.kcal / pending.cookedFactor)} kcal · ${(pending.per100.p / pending.cookedFactor).toFixed(1)}P / ${(pending.per100.c / pending.cookedFactor).toFixed(1)}C / ${(pending.per100.f / pending.cookedFactor).toFixed(1)}F / ${(pending.per100.fb / pending.cookedFactor).toFixed(1)}FB`
                    : `Per 100g raw: ${pending.per100.kcal} kcal · ${pending.per100.p}P / ${pending.per100.c}C / ${pending.per100.f}F / ${pending.per100.fb}FB`
                  : `Per serving: ${pending.per100.kcal} kcal · ${pending.per100.p}P / ${pending.per100.c}C / ${pending.per100.f}F / ${pending.per100.fb}FB`}
              </p>
              {pending.basis === '100g' && pending.cookedFactor && (
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setWeighMode('raw')}
                    className={`flex-1 py-2 rounded-lg text-[.82rem] font-bold border ${weighMode === 'raw' ? 'bg-forest text-white border-forest' : 'bg-white text-inksoft border-line'}`}>
                    Raw
                  </button>
                  <button onClick={() => setWeighMode('cooked')}
                    className={`flex-1 py-2 rounded-lg text-[.82rem] font-bold border ${weighMode === 'cooked' ? 'bg-forest text-white border-forest' : 'bg-white text-inksoft border-line'}`}>
                    Cooked
                  </button>
                </div>
              )}
              {pending.basis === '100g' && (
                <>
                  <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">
                    Grams {weighMode === 'cooked' && pending.cookedFactor ? '(cooked weight)' : 'eaten'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setGrams(String(Math.max(0, (parseFloat(grams) || 0) - 10)))}
                      className="w-11 h-11 rounded-full border border-line bg-white text-forest text-xl font-bold active:bg-paper flex-shrink-0">−</button>
                    <input type="number" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)}
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 100)}
                      className="flex-1 text-center text-base px-3.5 py-3 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
                    <button type="button" onClick={() => setGrams(String((parseFloat(grams) || 0) + 10))}
                      className="w-11 h-11 rounded-full border border-line bg-white text-forest text-xl font-bold active:bg-paper flex-shrink-0">＋</button>
                  </div>
                </>
              )}
              {pending.basis === 'serving' && (
                <>
                  <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Servings</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setServings(String(Math.max(1, (parseFloat(servings) || 1) - 1)))}
                      className="w-11 h-11 rounded-full border border-line bg-white text-forest text-xl font-bold active:bg-paper flex-shrink-0">−</button>
                    <input type="number" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)}
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 100)}
                      className="flex-1 text-center text-base px-3.5 py-3 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
                    <button type="button" onClick={() => setServings(String((parseFloat(servings) || 1) + 1))}
                      className="w-11 h-11 rounded-full border border-line bg-white text-forest text-xl font-bold active:bg-paper flex-shrink-0">＋</button>
                  </div>
                </>
              )}
              <MealPicker value={pending.meal} onChange={(meal) => setPending({ ...pending, meal })} />
              <button onClick={confirmPending} disabled={adding}
                className="w-full mt-4 bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90 disabled:opacity-60">
                {adding ? 'Saving…' : 'Add to log'}
              </button>
              {addError && <p className="text-center text-terra text-sm mt-2">{addError}</p>}
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
                        <span className="block text-[.68rem] text-inksoft">{l.kcal} kcal · {l.p}P / {l.c}C / {l.f}F / {l.fb}FB{qualityBadges(l.kcal, l.p, l.fb, lowP, lowFb)}</span>
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
                            {s.kcal} kcal {'\u00b7'} {s.p}P / {s.c}C / {s.f}F / {s.fb}FB{s.basis === '100g' ? ' / 100g' : ''}
                            {s.hint && <>{' \u00b7 '}{s.hint}</>}
                            {qualityBadges(s.kcal, s.p, s.fb, lowP, lowFb)}
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
            <div>
              {pendingSaved ? (
                <div>
                  <p className="font-display font-semibold text-lg">{pendingSaved.name}</p>
                  <p className="text-[.8rem] text-inksoft mb-1">
                    {pendingSaved.items.length} items · {Math.round(pendingSaved.items.reduce((s, i) => s + i.kcal * i.qty, 0))} kcal · {Math.round(pendingSaved.items.reduce((s, i) => s + i.p * i.qty, 0))}P / {Math.round(pendingSaved.items.reduce((s, i) => s + i.c * i.qty, 0))}C / {Math.round(pendingSaved.items.reduce((s, i) => s + i.f * i.qty, 0))}F / {Math.round(pendingSaved.items.reduce((s, i) => s + (i.fb ?? 0) * i.qty, 0))}FB
                  </p>
                  <div className="text-[.72rem] text-inksoft/70 mb-3">
                    {pendingSaved.items.map((it, i) => <span key={i}>{i > 0 && ', '}{it.name}{it.qty > 1 ? ` ×${it.qty}` : ''}</span>)}
                  </div>
                  <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Log to which meal?</label>
                  <MealPicker value={savedMealSlot} onChange={setSavedMealSlot} />
                  <button
                    onClick={() => { onAddSavedMeal(savedMealSlot, pendingSaved.items); close() }}
                    className="w-full mt-4 bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90"
                  >
                    Add to log
                  </button>
                  <button onClick={() => setPendingSaved(null)} className="w-full mt-2 text-sm text-inksoft">Back</button>
                </div>
              ) : (
                <>
                  {savedMeals.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[.7rem] font-bold uppercase tracking-widest text-forest mb-1.5 ml-0.5">Saved meals</p>
                      {savedMeals.map((sm) => {
                        const tot = sm.items.reduce((s, i) => ({ kcal: s.kcal + i.kcal * i.qty, p: s.p + i.p * i.qty, c: s.c + i.c * i.qty, f: s.f + i.f * i.qty, fb: s.fb + (i.fb ?? 0) * i.qty }), { kcal: 0, p: 0, c: 0, f: 0, fb: 0 })
                        return (
                          <div key={sm.id} className="flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5">
                            <button onClick={() => { setPendingSaved(sm); setSavedMealSlot('breakfast') }} className="flex-1 min-w-0 text-left">
                              <span className="block font-semibold text-[.92rem]">{sm.name}</span>
                              <span className="block text-[.68rem] text-inksoft">
                                {sm.items.length} items · {Math.round(tot.kcal)} kcal · {Math.round(tot.p)}P / {Math.round(tot.c)}C / {Math.round(tot.f)}F / {Math.round(tot.fb)}FB
                              </span>
                            </button>
                            <button onClick={() => onDeleteSavedMeal(sm.id)} className="text-macp/40 active:text-macp px-1">✕</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {myFoods.length > 0 && savedMeals.length > 0 && (
                    <p className="text-[.7rem] font-bold uppercase tracking-widest text-inksoft/60 mb-1.5 ml-0.5">Individual foods</p>
                  )}
                  {myFoods.length ? myFoods.map((f) => (
                    <div key={f.id} className="flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5">
                      <button onClick={() => chooseMyFood(f)} className="flex-1 min-w-0 text-left">
                        <span className="block font-semibold text-[.92rem]">{f.name}</span>
                        <span className="block text-[.68rem] text-inksoft">
                          {f.kcal} kcal · {f.p}P / {f.c}C / {f.f}F / {f.fb ?? 0}FB {f.basis === '100g' ? '/ 100g' : ''} · used {f.use_count}×
                          {qualityBadges(f.kcal, f.p, f.fb ?? 0, lowP, lowFb)}
                        </span>
                      </button>
                      <button onClick={() => onDeleteMyFood(f.id)} className="text-macp/40 active:text-macp px-1">✕</button>
                    </div>
                  )) : !savedMeals.length && <p className="text-center text-inksoft italic py-10 text-sm">No saved foods yet. Custom entries and scans land here automatically.</p>}
                </>
              )}
            </div>
          ) : tab === 'custom' ? (
            <div>
              <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Which meal?</label>
              <MealPicker value={customMeal} onChange={setCustomMeal} />
              <label className="block text-[.74rem] font-bold uppercase text-inksoft mt-3 mb-1.5">Food name</label>
              <input value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} placeholder="e.g. Cottage cheese"
                className="w-full text-base px-3.5 py-3 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
              <div className="grid grid-cols-5 gap-2 mt-3">
                {(['kcal', 'p', 'c', 'f', 'fb'] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-[.7rem] font-bold uppercase text-inksoft mb-1">{k === 'p' ? 'Prot' : k === 'c' ? 'Carb' : k === 'f' ? 'Fat' : k === 'fb' ? 'Fiber' : 'Kcal'}</label>
                    <input type="number" inputMode="numeric" value={cf[k]} onChange={(e) => setCf({ ...cf, [k]: e.target.value })} placeholder="0"
                      className="w-full text-base px-2.5 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra" />
                  </div>
                ))}
              </div>
              <button onClick={saveCustom} className="w-full mt-4 bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90">Add to log</button>
              <p className="text-[.74rem] text-inksoft italic mt-2 text-center">Leave kcal blank to estimate from macros (4/4/9).</p>
            </div>
          ) : tab === 'find' ? (
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
                      <button key={i} onClick={() => setPending({ name: r.name, meal: 'snack', basis: '100g', per100: { kcal: r.kcal, p: r.p, c: r.c, f: r.f, fb: r.fb }, cookedFactor: matchCookedFactor(r.name) })}
                        className="w-full flex items-center gap-2.5 bg-paper2 border border-line rounded-[11px] px-3 py-2.5 text-left active:bg-white">
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-[.92rem] truncate">{r.name}</span>
                          <span className="block text-[.68rem] text-inksoft">{r.kcal} kcal · {r.p}P / {r.c}C / {r.f}F / {r.fb ?? 0}FB / 100g</span>
                        </span>
                        <span className="text-forest text-xl font-bold">＋</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Barcode scanner — unmounted during photo capture to avoid camera conflict */}
              {!photoLoading && (
                <div>
                  <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Or scan a barcode</label>
                  <BarcodeScanner onDetected={onBarcode} onClose={() => setTab('menu')} />
                </div>
              )}

              {scanMsg && <p className="text-center text-terra text-sm mt-2">{scanMsg}</p>}
            </div>
          ) : tab === 'ai' ? (
            <div>
              {aiItems.length > 0 ? (
                <div>
                  <p className="text-[.7rem] font-bold uppercase tracking-widest text-forest mb-2 ml-0.5">Confirm items</p>
                  <p className="text-[.68rem] text-inksoft/70 mb-3 italic">Values are estimates — tap to edit, swipe to remove.</p>
                  {aiItems.map((item, idx) => {
                    const isCooked = item.weighMode === 'cooked' && item.cookedFactor
                    const dispKcal = isCooked ? Math.round(+item.kcal / item.cookedFactor!) : +item.kcal
                    const dispP = isCooked ? +( +item.p / item.cookedFactor!).toFixed(1) : +item.p
                    const dispC = isCooked ? +( +item.c / item.cookedFactor!).toFixed(1) : +item.c
                    const dispF = isCooked ? +( +item.f / item.cookedFactor!).toFixed(1) : +item.f
                    const dispFb = isCooked ? +( +(item.fb ?? 0) / item.cookedFactor!).toFixed(1) : +(item.fb ?? 0)
                    return (
                    <div key={idx} className="bg-paper2 border border-line rounded-[11px] px-3 py-2.5 mb-1.5">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <input value={item.name} onChange={(e) => updateAiItem(idx, 'name', e.target.value)}
                            className="block w-full font-semibold text-[.92rem] bg-transparent border-none p-0 focus:outline-none" />
                          <div className="flex gap-2 mt-1">
                            <span className="text-[.68rem] text-inksoft">
                              <input type="number" value={dispKcal} onChange={(e) => {
                                const v = +e.target.value; updateAiItem(idx, 'kcal', isCooked ? Math.round(v * item.cookedFactor!) : v)
                              }} className="w-10 bg-transparent border-b border-line text-center focus:outline-none focus:border-terra" /> kcal
                            </span>
                            <span className="text-[.68rem] text-inksoft">
                              <input type="number" value={dispP} onChange={(e) => {
                                const v = +e.target.value; updateAiItem(idx, 'p', isCooked ? +(v * item.cookedFactor!).toFixed(1) : v)
                              }} className="w-8 bg-transparent border-b border-line text-center focus:outline-none focus:border-terra" />P
                            </span>
                            <span className="text-[.68rem] text-inksoft">
                              <input type="number" value={dispC} onChange={(e) => {
                                const v = +e.target.value; updateAiItem(idx, 'c', isCooked ? +(v * item.cookedFactor!).toFixed(1) : v)
                              }} className="w-8 bg-transparent border-b border-line text-center focus:outline-none focus:border-terra" />C
                            </span>
                            <span className="text-[.68rem] text-inksoft">
                              <input type="number" value={dispF} onChange={(e) => {
                                const v = +e.target.value; updateAiItem(idx, 'f', isCooked ? +(v * item.cookedFactor!).toFixed(1) : v)
                              }} className="w-8 bg-transparent border-b border-line text-center focus:outline-none focus:border-terra" />F
                            </span>
                            <span className="text-[.68rem] text-inksoft">
                              <input type="number" value={dispFb} onChange={(e) => {
                                const v = +e.target.value; updateAiItem(idx, 'fb', isCooked ? +(v * item.cookedFactor!).toFixed(1) : v)
                              }} className="w-8 bg-transparent border-b border-line text-center focus:outline-none focus:border-terra" />FB
                            </span>
                          </div>
                          {item.cookedFactor && (
                            <div className="flex gap-1 mt-1.5">
                              <button onClick={() => updateAiItem(idx, 'weighMode', 'raw')}
                                className={`px-2 py-0.5 rounded text-[.68rem] font-bold border ${item.weighMode !== 'cooked' ? 'bg-forest text-white border-forest' : 'bg-white text-inksoft border-line'}`}>
                                Raw
                              </button>
                              <button onClick={() => updateAiItem(idx, 'weighMode', 'cooked')}
                                className={`px-2 py-0.5 rounded text-[.68rem] font-bold border ${item.weighMode === 'cooked' ? 'bg-forest text-white border-forest' : 'bg-white text-inksoft border-line'}`}>
                                Cooked
                              </button>
                            </div>
                          )}
                          <div className="mt-1.5">
                            <select value={item.meal} onChange={(e) => updateAiItem(idx, 'meal', e.target.value)}
                              className="text-[.7rem] bg-white border border-line rounded px-1.5 py-0.5 text-inksoft">
                              {MEALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            {item.estimated && <span className="ml-2 text-[.65rem] text-terra italic">estimated</span>}
                          </div>
                        </div>
                        <button onClick={() => removeAiItem(idx)} className="text-macp/40 active:text-macp px-1 pt-1">✕</button>
                      </div>
                    </div>
                    )
                  })}
                  <div className="bg-paper2 border border-line rounded-[11px] px-3 py-2 mt-2 text-center text-[.78rem] font-semibold text-inksoft">
                    Total: {Math.round(aiItems.reduce((s, i) => s + (+i.kcal), 0))} kcal · {Math.round(aiItems.reduce((s, i) => s + (+i.p), 0))}P / {Math.round(aiItems.reduce((s, i) => s + (+i.c), 0))}C / {Math.round(aiItems.reduce((s, i) => s + (+i.f), 0))}F / {Math.round(aiItems.reduce((s, i) => s + (+(i.fb ?? 0)), 0))}FB
                  </div>
                  <button onClick={confirmAiItems} disabled={adding}
                    className="w-full mt-4 bg-forest text-white font-bold py-3.5 rounded-xl active:opacity-90 disabled:opacity-60">
                    {adding ? 'Saving…' : `Add ${aiItems.length} items to log`}
                  </button>
                  <button onClick={() => setAiItems([])} className="w-full mt-2 text-sm text-inksoft">Back</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Describe meal */}
                  <div>
                    <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Describe your meal</label>
                    <form onSubmit={(ev) => { ev.preventDefault(); onDescribe() }}>
                      <textarea value={aiText} onChange={(e) => setAiText(e.target.value)}
                        placeholder="e.g. two eggs, toast with butter, and a coffee with milk"
                        rows={3}
                        className="w-full text-base px-3.5 py-2.5 border border-line rounded-[10px] bg-white focus:outline-none focus:border-terra resize-none" />
                      <button type="submit" disabled={aiLoading || !aiText.trim()}
                        className="w-full mt-2 bg-forest text-white font-bold py-3 rounded-xl active:opacity-90 disabled:opacity-50">
                        {aiLoading ? 'Parsing…' : 'Parse meal'}
                      </button>
                    </form>
                  </div>

                  {/* Plate photo */}
                  <div>
                    <label className="block text-[.74rem] font-bold uppercase text-inksoft mb-1.5">Or snap your plate</label>
                    <input ref={plateRef} type="file" accept="image/*" capture="environment" onChange={onPlatePhoto} className="hidden" />
                    <button onClick={() => plateRef.current?.click()} disabled={aiLoading}
                      className="w-full flex items-center justify-center gap-2 bg-terra text-white font-bold py-3 rounded-xl active:opacity-90 disabled:opacity-50">
                      {aiLoading ? 'Analyzing…' : '📸 Snap plate'}
                    </button>
                  </div>

                  {aiError && <p className="text-center text-terra text-sm">{aiError}</p>}
                  <p className="text-[.68rem] text-inksoft/60 italic text-center">AI estimates macros using Gemini. Review before saving.</p>
                </div>
              )}
            </div>
          ) : null}
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
