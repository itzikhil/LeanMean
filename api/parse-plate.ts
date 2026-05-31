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
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 1024 },
    })

    const prompt = `Identify foods on this plate with estimated portions and macros. Match known foods when possible.

KNOWN FOODS:
${knownFoods || '(none)'}

Return ONLY a JSON array. Each item: {"name":"Food (~Xg)","kcal":N,"p":N,"c":N,"f":N,"qty":1,"meal":"breakfast|snack|lunch|prewo|dinner|extras","estimated":true}
If no food visible return [].`

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
