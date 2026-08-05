'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { appConfig } from '@/lib/config'
import posthog from 'posthog-js'

const UNLOCK_COST = appConfig.credits.unlockScan

interface Props {
  scanId: string
  locked: boolean
  availableCredits: number
  children: React.ReactNode
}

export function LockedSection({ scanId, locked, availableCredits, children }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!locked) return <>{children}</>

  const canAfford = availableCredits >= UNLOCK_COST

  async function unlock() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/scans/${scanId}/unlock`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Unlock failed. Please try again.')
        return
      }
      posthog.capture('scan_unlocked', { scan_id: scanId })
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-md" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-black/40 via-black/70 to-black">
        <div className="sticky top-8 mx-4 w-full max-w-sm rounded-2xl border border-purple-500/30 bg-[#0a0a0a] p-7 text-center shadow-2xl">
          <div className="mb-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl btn-gradient">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>

          <h3 className="text-xl font-black text-white">Your full analysis is ready</h3>
          <p className="mt-2 text-sm text-[#888]">
            Unlock all 9 metrics, your category breakdown and your personalized glow-up plan.
          </p>

          {canAfford ? (
            <button
              onClick={unlock}
              disabled={loading}
              className="btn-gradient mt-6 w-full rounded-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Unlocking…' : `Unlock for ${UNLOCK_COST} credits`}
            </button>
          ) : (
            <>
              <Link
                href="/pricing"
                className="btn-gradient mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Unlock from $2.99
              </Link>
              <p className="mt-3 text-xs text-[#555]">
                You have {availableCredits} of {UNLOCK_COST} credits needed
              </p>
            </>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
