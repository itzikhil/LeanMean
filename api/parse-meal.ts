import type { VercelRequest, VercelResponse } from '@vercel/node'
import { genAI, geminiWithRetry, friendlyError } from './_gemini'

/** Strip markdown fences and any text before the first [/{ or after the last ]/}. */
function extractJson(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.search(/[\[{]/)
  const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'))
  if (start >= 0 && end >= start) s = s.slice(start, end + 1)
  return s
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { text, knownFoods } = req.body as { text?: string; knownFoods?: string }
  if (!text) return res.status(400).json({ error: 'Missing text' })

  const prompt = `Parse this meal into food items with macros. Match against known foods when possible; estimate unknowns.

KNOWN FOODS:
${knownFoods || '(none)'}

INPUT: "${text}"

Return ONLY a JSON array. Each item: {"name":"…","kcal":N,"p":N,"c":N,"f":N,"fb":N,"qty":1,"meal":"breakfast|snack|lunch|prewo|dinner|extras","estimated":bool}
Use estimated:false for known-food matches, true for estimates. If unparseable return [].`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 1024, responseMimeType: 'application/json' },
    })

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await geminiWithRetry(model, prompt, 'parse-meal')
      const raw = result.response.text()
      try {
        const parsed = JSON.parse(extractJson(raw))
        if (!Array.isArray(parsed)) continue
        return res.status(200).json({ items: parsed })
      } catch {
        if (attempt === 0) continue
      }
    }

    return res.status(422).json({ error: 'Could not parse response. Try rephrasing, or switch to manual entry.' })
  } catch (e: unknown) {
    return res.status(500).json({ error: friendlyError(e, 'parse-meal') })
  }
}
