'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { appConfig } from '@/lib/config'

async function createSession(idToken: string): Promise<{ hasPurchased: boolean }> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  const data = (await res.json()) as { hasPurchased?: boolean }
  return { hasPurchased: data.hasPurchased === true }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await credential.user.getIdToken()
      const { hasPurchased } = await createSession(idToken)
      router.push(hasPurchased ? '/dashboard' : '/onboarding/pricing')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      setError(msg.replace('Firebase: ', '').replace(/\s*\(auth\/.*\)\.?/, ''))
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      const idToken = await credential.user.getIdToken()
      const { hasPurchased } = await createSession(idToken)
      router.push(hasPurchased ? '/dashboard' : '/onboarding/pricing')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed'
      setError(msg.replace('Firebase: ', '').replace(/\s*\(auth\/.*\)\.?/, ''))
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt={appConfig.brand.name} width={72} height={72} className="mx-auto rounded-2xl shadow-lg shadow-purple-900/30" />
        <h1 className="mt-4 text-2xl font-black text-white tracking-tight">{appConfig.brand.name}</h1>
        <p className="mt-1 text-sm text-[#666]">Sign in to your account</p>
      </div>

      <div className="rounded-2xl bg-[#111111] border border-[#222222] p-8">
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm text-white placeholder-[#555555] focus:border-purple-500 focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl bg-[#1a1a1a] border border-[#333333] px-4 py-3 text-sm text-white placeholder-[#555555] focus:border-purple-500 focus:outline-none transition-colors"
          />

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold text-white btn-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#222222]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#111111] px-3 text-[#555555]">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#333333] bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white hover:bg-[#222222] hover:border-[#444444] transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-[#888888]">
        No account?{' '}
        <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
