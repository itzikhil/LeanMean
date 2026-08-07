import type { VercelRequest, VercelResponse } from '@vercel/node'
import { genAI, geminiWithRetry, friendlyError } from './_gemini.js'
import { extractJson, normalizeItems, unwrapArray } from './_parsed.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const { text, knownFoods } = req.body as { text?: string; knownFoods?: string }
    if (!text) return res.status(400).json({ error: 'Missing text' })

    const prompt = `Parse this meal into food items with macros. Match against known foods when possible; estimate unknowns.

KNOWN FOODS (macros are listed per 100g or per serving as noted — scale them to the amount actually eaten):
${knownFoods || '(none)'}

INPUT: "${text}"

RULES:
- kcal/p/c/f/fb must be the TOTAL for the amount eaten, already scaled. Never return per-100g values.
- "qty" is the number of SERVINGS of an item. It is NEVER a weight and defaults to 1.
  A weight belongs in the name and in the scaled macros:
  "138 grams of chicken breast" -> {"name":"Chicken breast (138g)","kcal":166,"p":32,"c":0,"f":3.6,"fb":0,"qty":1}
  NOT {"kcal":120,"qty":138} and NOT {"kcal":166,"qty":138}.
- Use qty > 1 only for genuinely countable repeats: "3 eggs" -> qty:3 with per-egg macros.
- "meal" must be exactly one of: breakfast, lunch, dinner, snack.
- CRITICAL: For vague or ambiguous sizes, ALWAYS estimate a reasonable portion — NEVER fail or return []:
  • Small/S/Kids: ~100-150g
  • Medium/M/Regular/Normal: ~150-200g
  • Large/L/Big: ~200-300g
  • XL/Extra-Large/Jumbo: ~300-400g
  • "a bowl of", "a plate of", "some": ~200g
  • "a handful of": ~30-50g
  • "a cup of": ~240ml/g (adjust for density)
  When in doubt, pick a middle estimate. Users can correct on the confirm screen.

Return ONLY a JSON array. Each item: {"name":"…","kcal":N,"p":N,"c":N,"f":N,"fb":N,"qty":1,"meal":"breakfast|lunch|dinner|snack","estimated":bool}
Use estimated:false for known-food matches, true for estimates. If unparseable return [].`

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 1024, responseMimeType: 'application/json' },
    })

    let lastRaw = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await geminiWithRetry(model, prompt, 'parse-meal')
      const raw = result.response.text()
      lastRaw = raw
      try {
        const parsed = JSON.parse(extractJson(raw))
        const items = unwrapArray(parsed)
        if (!items) {
          console.warn(`[parse-meal] attempt ${attempt + 1}: not an array or wrapped array`)
          console.warn(`[parse-meal] raw response:`, raw)
          continue
        }
        return res.status(200).json({ items: normalizeItems(items, 'parse-meal') })
      } catch (parseErr) {
        console.warn(`[parse-meal] attempt ${attempt + 1}: JSON parse failed:`, parseErr)
        console.warn(`[parse-meal] raw response:`, raw)
        if (attempt === 0) continue
      }
    }

    console.error('[parse-meal] all attempts failed for input:', text)
    console.error('[parse-meal] last raw response:', lastRaw)
    return res.status(422).json({ error: 'Could not parse response. Try rephrasing, or switch to manual entry.' })
  } catch (e: unknown) {
    return res.status(500).json({ error: friendlyError(e, 'parse-meal') })
  }
}
