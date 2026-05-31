import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { text, knownFoods } = req.body as { text?: string; knownFoods?: string }
  if (!text) return res.status(400).json({ error: 'Missing text' })

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 1024 },
    })

    const prompt = `Parse this meal into food items with macros. Match against known foods when possible; estimate unknowns.

KNOWN FOODS:
${knownFoods || '(none)'}

INPUT: "${text}"

Return ONLY a JSON array. Each item: {"name":"…","kcal":N,"p":N,"c":N,"f":N,"qty":1,"meal":"breakfast|snack|lunch|prewo|dinner|extras","estimated":bool}
Use estimated:false for known-food matches, true for estimates. If unparseable return [].`

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
