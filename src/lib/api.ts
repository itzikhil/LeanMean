import { supabase } from './supabase'

/**
 * POST JSON to an API endpoint with Supabase auth token.
 * Retries once on 5xx errors (absorbs cold-start timeouts).
 */
export async function authFetch<T = unknown>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  // Debug logging (temporary)
  console.log('[authFetch]', url, { hasToken: !!token, sessionError: sessionError?.message })

  if (!token) {
    throw new Error('Not authenticated - please sign in again')
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) return res.json()

    let data: { error: string }
    try {
      data = await res.json()
    } catch {
      data = { error: `Server error (${res.status})` }
    }

    // Retry once on 5xx
    if (res.status >= 500 && attempt === 0) continue

    // Throw on auth errors or after retry exhausted
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  throw new Error('Request failed after retry')
}
