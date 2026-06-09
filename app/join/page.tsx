'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2 } from 'lucide-react'

export default function JoinPage() {
  const [step, setStep] = useState<'code' | 'account'>('code')
  const [inviteCode, setInviteCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Step 1: validate the invite code against the DB before creating an account
  async function handleCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!inviteCode.trim()) { setError('Enter an invite code'); return }
    setLoading(true)
    const res = await fetch(`/api/companies/validate-invite?code=${encodeURIComponent(inviteCode.trim())}`)
    setLoading(false)
    if (!res.ok) {
      setError('Invalid invite code. Double-check with your admin.')
      return
    }
    const data = await res.json()
    setCompanyName(data.companyName ?? '')
    setStep('account')
  }

  // Step 2: create auth account and join company
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Create auth account
    const { error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'agent' } },
    })
    if (signupErr && !signupErr.message.includes('already registered')) {
      setError(signupErr.message); setLoading(false); return
    }
    // Sign in immediately (bypasses email confirmation requirement)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) { setError(signInErr.message); setLoading(false); return }

    // Join company with the validated invite code
    const res = await fetch('/api/companies/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, fullName }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.push('/dashboard')
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">PropFlow CRM</p>
            <p className="text-xs text-gray-500">Join your team</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 'code' ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Enter your invite code</h1>
              <p className="text-sm text-gray-500 mb-6">Your admin shared a code when they set up the company.</p>
              <form onSubmit={handleCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invite Code</label>
                  <input
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    required
                    placeholder="XXXXXXXX"
                    className={`${inputCls} font-mono text-base tracking-widest`}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
                  {loading ? 'Checking code…' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-gray-500">Joining</span>
                <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {companyName}
                </span>
                <span className="text-sm text-gray-500">as an agent.</span>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Smith" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Work Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className={inputCls} />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setStep('code'); setError('') }}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
                    {loading ? 'Joining…' : 'Join Team'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Starting a new company?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline font-medium">Create one</Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
