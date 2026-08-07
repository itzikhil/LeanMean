import type { VercelRequest, VercelResponse } from '@vercel/node'
import { genAI, geminiWithRetry, friendlyError } from './_gemini.js'

/** Strip markdown fences and any text before the first { or after the last }. */
function extractJson(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end >= start) s = s.slice(start, end + 1)
  return s
}

/**
 * Unwrap object-wrapped responses.
 * If model returns {item: {...}, ...} or {result: {...}, ...}, extract the inner object.
 */
function unwrapObject(parsed: Record<string, unknown>): Record<string, unknown> {
  // If it already has the expected fields, return as-is
  if ('kcal' in parsed || 'error' in parsed) return parsed
  // Check common wrapper keys
  for (const key of ['item', 'result', 'data', 'nutrition', 'food']) {
    const val = parsed[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return val as Record<string, unknown>
    }
  }
  // Return original if no wrapper found
  return parsed
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const { image } = req.body as { image?: string }
    if (!image) return res.status(400).json({ error: 'Missing image (base64)' })

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    const mimeType = match?.[1] ?? 'image/jpeg'
    const b64 = match ? match[2] : image

    const content = [
      { inlineData: { mimeType, data: b64 } },
      { text: `Extract nutrition facts from this label. Return ONLY JSON: {"name":"…","basis":"100g" or "serving","kcal":N,"p":N,"c":N,"f":N,"fb":N}. "fb" is fiber in grams (0 if not on label). Convert kJ÷4.184=kcal. Handle EU labels (comma decimals, German/French/Italian terms). If unreadable: {"error":"Could not parse label"}.` },
    ]

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 256, responseMimeType: 'application/json' },
    })

    let lastRaw = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await geminiWithRetry(model, content, 'parse-label')
      const raw = result.response.text()
      lastRaw = raw
      try {
        const rawParsed = JSON.parse(extractJson(raw)) as Record<string, unknown>
        const parsed = unwrapObject(rawParsed)
        if (parsed.error) return res.status(422).json(parsed)
        return res.status(200).json(parsed)
      } catch (parseErr) {
        console.warn(`[parse-label] attempt ${attempt + 1}: JSON parse failed:`, parseErr)
        console.warn(`[parse-label] raw response:`, raw)
        if (attempt === 0) continue
      }
    }

    console.error('[parse-label] all attempts failed')
    console.error('[parse-label] last raw response:', lastRaw)
    return res.status(422).json({ error: 'Could not read label. Try again or switch to manual entry.' })
  } catch (e: unknown) {
    return res.status(500).json({ error: friendlyError(e, 'parse-label') })
  }
}
