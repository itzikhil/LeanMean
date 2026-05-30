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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: { mimeType, data: b64 },
      },
      {
        text: `Extract the nutrition facts from this food label photo.
Return ONLY a valid JSON object (no markdown fences, no explanation) with exactly these fields:
- "name": product name (string)
- "basis": "100g" if the values are per 100 g/ml, otherwise "serving"
- "kcal": calories in kcal (number). If only kJ is shown, divide by 4.184 and round.
- "p": protein in grams (number)
- "c": carbohydrates in grams (number)
- "f": fat in grams (number)

Handle European labels: comma decimals (e.g. "1,9 g" = 1.9), kJ-to-kcal conversion, German/Italian/French field names (Eiweiss/Proteine/Proteines = protein, Kohlenhydrate/Carboidrati/Glucides = carbs, Fett/Grassi/Lipides = fat, Brennwert/Energia/Valeur energetique = energy).
If you cannot read the label, return {"error": "Could not parse label"}.`,
      },
    ])

    let text = result.response.text().trim()

    // Strip markdown code fences if the model wrapped the JSON
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
