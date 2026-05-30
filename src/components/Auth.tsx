import { useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function signIn() {
    setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="font-display font-black text-3xl text-forest leading-none">
          Lean <span className="italic font-medium text-terra">Kitchen</span>
        </div>
        <p className="font-display italic text-inksoft mt-2 mb-8">Your macros, your menu.</p>

        {!supabaseReady && (
          <div className="text-sm text-terra bg-paper2 border border-line rounded-xl p-4 mb-5 text-left">
            Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file, then restart.
          </div>
        )}

        {sent ? (
          <p className="text-forest">Check your email for a sign-in link.</p>
        ) : (
          <>
            <input
              className="w-full text-base px-4 py-3 rounded-xl border border-line bg-white focus:outline-none focus:border-terra"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="w-full mt-3 bg-forest text-paper font-bold py-3.5 rounded-xl active:opacity-90 disabled:opacity-40"
              disabled={!email || !supabaseReady}
              onClick={signIn}
            >
              Send magic link
            </button>
            {err && <p className="text-terra text-sm mt-3">{err}</p>}
          </>
        )}
      </div>
    </div>
  )
}
