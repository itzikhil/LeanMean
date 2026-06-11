import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from './_auth.js'
import { genAI, geminiWithRetry, friendlyError } from './_gemini.js'

/** Strip markdown fences and any text before the first [ or after the last ]. */
function extractJson(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.search(/[\[{]/)
  const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'))
  if (start >= 0 && end >= start) s = s.slice(start, end + 1)
  return s
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const userId = await requireAuth(req, res)
    if (!userId) return

    const { image, knownFoods } = req.body as { image?: string; knownFoods?: string }
    if (!image) return res.status(400).json({ error: 'Missing image (base64)' })

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    const mimeType = match?.[1] ?? 'image/jpeg'
    const b64 = match ? match[2] : image

    const prompt = `Identify foods on this plate with estimated portions and macros. Match known foods when possible.

KNOWN FOODS:
${knownFoods || '(none)'}

Return ONLY a JSON array. Each item: {"name":"Food (~Xg)","kcal":N,"p":N,"c":N,"f":N,"fb":N,"qty":1,"meal":"breakfast|snack|lunch|prewo|dinner|extras","estimated":true}
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
        return res.status(200).json({ items: parsed })
      } catch {
        if (attempt === 0) continue
      }
    }

    return res.status(422).json({ error: 'Could not analyze photo. Try again or switch to manual entry.' })
  } catch (e: unknown) {
    return res.status(500).json({ error: friendlyError(e, 'parse-plate') })
  }
}
