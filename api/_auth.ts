import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * Validate the Supabase JWT from the Authorization header.
 * Returns the user ID if valid, or sends a 401 response and returns null.
 * Always returns JSON, never throws.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' })
      return null
    }

    const token = authHeader.slice(7)
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return null
    }

    return data.user.id
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
    return null
  }
}
