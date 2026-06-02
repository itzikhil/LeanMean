import { GoogleGenerativeAI, type GenerativeModel, type GenerateContentRequest } from '@google/generative-ai'

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const RETRYABLE = /503|429|overloaded|resource.*exhausted|quota|unavailable|high demand/i

/** Detect whether a Gemini SDK error is transient (503/429/overloaded). */
function isTransient(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return RETRYABLE.test(err.message)
}

const FRIENDLY: Record<string, string> = {
  coach: 'The coach is busy right now — try again in a moment.',
  'parse-label': 'Label scanner is temporarily unavailable — try again in a moment.',
  'parse-meal': 'Meal parser is temporarily unavailable — try again in a moment.',
  'parse-plate': 'Photo analyzer is temporarily unavailable — try again in a moment.',
}

/**
 * Call model.generateContent with automatic retry + exponential backoff
 * on transient Gemini errors (503/429/overloaded).
 * Retries up to `maxRetries` times (default 2) with 1s, 2s delays.
 * On non-transient errors, throws immediately.
 * On exhausted retries, throws with a friendly message.
 */
export async function geminiWithRetry(
  model: GenerativeModel,
  content: GenerateContentRequest | string | Array<unknown>,
  fnName: string,
  maxRetries = 2,
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await model.generateContent(content as any)
    } catch (err) {
      if (!isTransient(err) || attempt === maxRetries) {
        if (isTransient(err)) {
          throw new Error(FRIENDLY[fnName] || 'Service temporarily unavailable — try again in a moment.')
        }
        throw err
      }
      // Exponential backoff: 1s, 2s
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  throw new Error(FRIENDLY[fnName] || 'Service temporarily unavailable.')
}

/** Sanitize Gemini error messages so raw SDK internals are never shown to users. */
export function friendlyError(err: unknown, fnName: string): string {
  if (!(err instanceof Error)) return FRIENDLY[fnName] || 'Something went wrong — try again.'
  if (RETRYABLE.test(err.message)) return FRIENDLY[fnName] || 'Service temporarily unavailable — try again in a moment.'
  // Strip GoogleGenerativeAI class prefix and stack traces
  const msg = err.message.replace(/^\[GoogleGenerativeAI Error\]:?\s*/i, '').split('\n')[0]
  // If it still looks like an internal error, replace it
  if (msg.length > 120 || /stack|trace|internal|grpc/i.test(msg)) {
    return FRIENDLY[fnName] || 'Something went wrong — try again.'
  }
  return msg
}
