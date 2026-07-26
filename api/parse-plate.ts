import type { VercelRequest, VercelResponse } from '@vercel/node'
import { genAI, geminiWithRetry, friendlyError } from './_gemini.js'
import { extractJson, normalizeItems } from './_parsed.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const { image, knownFoods } = req.body as { image?: string; knownFoods?: string }
    if (!image) return res.status(400).json({ error: 'Missing image (base64)' })

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    const mimeType = match?.[1] ?? 'image/jpeg'
    const b64 = match ? match[2] : image

    const prompt = `Identify foods on this plate with estimated portions and macros. Match known foods when possible.

KNOWN FOODS (macros are listed per 100g or per serving as noted — scale them to the portion you see):
${knownFoods || '(none)'}

RULES:
- kcal/p/c/f/fb must be the TOTAL for the portion on the plate, already scaled. Never return per-100g values.
- Put the estimated weight in the name, as "Food (~Xg)".
- "qty" is the number of SERVINGS of an item. It is NEVER a weight and defaults to 1.
  A 138g piece of chicken is {"name":"Chicken breast (~138g)","kcal":166,...,"qty":1}, never qty:138.
- Use qty > 1 only for genuinely countable repeats: two visible eggs -> qty:2 with per-egg macros.
- "meal" must be exactly one of: breakfast, lunch, dinner, snack.

Return ONLY a JSON array. Each item: {"name":"Food (~Xg)","kcal":N,"p":N,"c":N,"f":N,"fb":N,"qty":1,"meal":"breakfast|lunch|dinner|snack","estimated":true}
If no food visible return [].`

    const content = [
      { inlineData: { mimeType, data: b64 } },
      { text: prompt },
    ]

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 1024, responseMimeType: 'application/json' },
    })

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await geminiWithRetry(model, content, 'parse-plate')
      const raw = result.response.text()
      try {
        const parsed = JSON.parse(extractJson(raw))
        if (!Array.isArray(parsed)) continue
        return res.status(200).json({ items: normalizeItems(parsed, 'parse-plate') })
      } catch {
        if (attempt === 0) continue
      }
    }

    return res.status(422).json({ error: 'Could not analyze photo. Try again or switch to manual entry.' })
  } catch (e: unknown) {
    return res.status(500).json({ error: friendlyError(e, 'parse-plate') })
  }
}
