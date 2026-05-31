import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { image, knownFoods } = req.body as { image?: string; knownFoods?: string }
  if (!image) return res.status(400).json({ error: 'Missing image (base64)' })

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
  const mimeType = match?.[1] ?? 'image/jpeg'
  const b64 = match ? match[2] : image

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a nutrition assistant. Analyze this photo of a meal/plate and identify each food item with estimated portions and macros.

KNOWN FOODS DATABASE (use these exact values when you can match):
${knownFoods || '(none provided)'}

INSTRUCTIONS:
1. Identify each distinct food item visible on the plate/in the photo.
2. Estimate the portion size for each item.
3. If a food matches (or closely matches) something in the KNOWN FOODS DATABASE above, use the exact macro values from the database scaled to the estimated portion.
4. For foods NOT in the database, estimate reasonable macros based on common nutritional data.
5. Assign each item to the most likely meal slot: "breakfast", "snack", "lunch", "prewo", "dinner", or "extras".

Return ONLY a valid JSON array (no markdown fences, no explanation). Each element must have exactly these fields:
- "name": string (food name with estimated portion, e.g. "Chicken breast (~150g)")
- "kcal": number (total calories for the estimated portion)
- "p": number (protein in grams)
- "c": number (carbs in grams)
- "f": number (fat in grams)
- "qty": number (always 1, macros already scaled to portion)
- "meal": string (one of: "breakfast", "snack", "lunch", "prewo", "dinner", "extras")
- "estimated": boolean (true for all plate-photo items since portions are estimated)

If you cannot identify food in the image, return [].`

    const result = await model.generateContent([
      { inlineData: { mimeType, data: b64 } },
      { text: prompt },
    ])

    let responseText = result.response.text().trim()
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    let parsed: unknown
    try {
      parsed = JSON.parse(responseText)
    } catch {
      return res.status(422).json({ error: 'Model returned invalid JSON. Try again.' })
    }

    if (!Array.isArray(parsed)) {
      return res.status(422).json({ error: 'Expected an array of items.' })
    }

    return res.status(200).json({ items: parsed })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
