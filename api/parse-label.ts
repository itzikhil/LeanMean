import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { image } = req.body as { image?: string }
  if (!image) return res.status(400).json({ error: 'Missing image (base64)' })

  // Strip data-URI prefix if present, keep the mime type
  const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
  const mimeType = match?.[1] ?? 'image/jpeg'
  const b64 = match ? match[2] : image

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 256 },
    })

    const result = await model.generateContent([
      { inlineData: { mimeType, data: b64 } },
      { text: `Extract nutrition facts from this label. Return ONLY JSON: {"name":"…","basis":"100g" or "serving","kcal":N,"p":N,"c":N,"f":N,"fb":N}. "fb" is fiber in grams (number, 0 if not on label). Convert kJ÷4.184=kcal. Handle EU labels (comma decimals, German/French/Italian terms). If unreadable: {"error":"Could not parse label"}.` },
    ])

    let text = result.response.text().trim()
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      return res.status(422).json({ error: 'Model returned invalid JSON. Try again or add manually.' })
    }

    if (parsed.error) return res.status(422).json(parsed)
    return res.status(200).json(parsed)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
