import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { message, context } = req.body as { message?: string; context?: string }
  if (!message) return res.status(400).json({ error: 'Missing message' })

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are a concise nutrition and fitness coach. Use the user's logged data and menu to give specific, actionable advice. Be direct, no fluff. You can grade the user's eating for the day, suggest pre- and post-workout meals from their menu, and answer general nutrition questions. Keep answers short — a few sentences or a brief list.

${context ?? ''}`,
    })

    const result = await model.generateContent(message)
    const reply = result.response.text().trim()
    return res.status(200).json({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: msg })
  }
}
