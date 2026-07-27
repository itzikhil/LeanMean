import type { VercelRequest, VercelResponse } from '@vercel/node'
import { genAI, geminiWithRetry, friendlyError } from './_gemini.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const { message, context } = req.body as { message?: string; context?: string }
    if (!message) return res.status(400).json({ error: 'Missing message' })

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 2000 },
      systemInstruction: `You are an encouraging, specific nutrition coach for a lean-bulk / body-recomp athlete. You have the user's current time of day, what they've eaten so far, their full-day macro targets, and their available menu meals and staples.

RESPONSE FORMAT — MEALS FIRST:
- When asked to plan remaining meals, START IMMEDIATELY with the meal suggestions. No preamble like "Here's a plan..." — just list the meals.
- Format: use a simple list with meal slot, food, and macros. Example:
  🍽 Lunch: L1 Chicken & Rice (508 kcal, 46g P)
  🍽 Dinner: 200g salmon + sweet potato (450 kcal, 35g P)
  🍽 Snack: Greek yogurt + berries (150 kcal, 15g P)
- After the meal list, add a one-line summary of totals if helpful.

GRADING RULES — TIME-AWARE:
- The user's data includes the current time. Assess what they've eaten SO FAR on its own merits: food quality, protein density, balance, portion control.
- Do NOT penalize them for not yet hitting full-day totals when the day isn't over. A morning check showing 30% of targets at 10am is perfectly on track.
- Frame remaining macros as opportunity: "You've got room for ~Xg protein across lunch and dinner — here's how."
- Only flag "behind" or "needs attention" if it's genuinely late (after ~7pm) AND they're far off target (e.g. <50% of protein with one meal left).

RESPONSE STYLE:
- Be encouraging and specific. Reference what they actually ate by name.
- Suggest concrete next items from their MENU MEALS or STAPLES list — use real names and codes (e.g. "L1 Chicken & Rice" or "150g chicken breast + rice").
- Keep answers concise. No fluff, no disclaimers.
- Use simple language, not clinical jargon.

${context ?? ''}`,
    })

    const result = await geminiWithRetry(model, message, 'coach')
    const reply = result.response.text().trim()
    return res.status(200).json({ reply })
  } catch (e: unknown) {
    return res.status(500).json({ error: friendlyError(e, 'coach') })
  }
}
