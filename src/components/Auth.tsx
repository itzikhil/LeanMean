import { useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setErr('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setErr(error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setErr(error.message)
      }
    } finally {
      setLoading(false)
    }
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

        <input
          className="w-full text-base px-4 py-3 rounded-xl border border-line bg-white focus:outline-none focus:border-terra"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full text-base px-4 py-3 rounded-xl border border-line bg-white focus:outline-none focus:border-terra mt-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full mt-3 bg-forest text-paper font-bold py-3.5 rounded-xl active:opacity-90 disabled:opacity-40"
          disabled={!email || !password || !supabaseReady || loading}
          onClick={handleSubmit}
        >
          {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        {err && <p className="text-terra text-sm mt-3">{err}</p>}

        <p className="text-inksoft text-sm mt-4">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button className="text-forest font-bold" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr('') }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
