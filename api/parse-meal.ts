import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { text, knownFoods } = req.body as { text?: string; knownFoods?: string }
  if (!text) return res.status(400).json({ error: 'Missing text' })

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a nutrition assistant. Parse the following meal description into individual food items with estimated macros.

KNOWN FOODS DATABASE (use these exact values when you can match):
${knownFoods || '(none provided)'}

USER INPUT: "${text}"

INSTRUCTIONS:
1. Parse each food item and its quantity from the description.
2. If a food matches (or closely matches) something in the KNOWN FOODS DATABASE above, use the exact name and macro values from the database. Scale by quantity.
3. For foods NOT in the database, estimate reasonable macros based on common nutritional data.
4. Assign each item to the most likely meal slot: "breakfast", "snack", "lunch", "prewo", "dinner", or "extras".

Return ONLY a valid JSON array (no markdown fences, no explanation). Each element must have exactly these fields:
- "name": string (food name with portion info)
- "kcal": number (total calories for the quantity)
- "p": number (protein in grams)
- "c": number (carbs in grams)
- "f": number (fat in grams)
- "qty": number (always 1, macros already scaled to portion)
- "meal": string (one of: "breakfast", "snack", "lunch", "prewo", "dinner", "extras")
- "estimated": boolean (false if matched from known foods, true if estimated)

If you cannot parse the input, return [].`

    const result = await model.generateContent(prompt)
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
