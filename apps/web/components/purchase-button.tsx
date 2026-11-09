'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Purchases, PurchasesError, ErrorCode } from '@revenuecat/purchases-js'
import { auth } from '@/lib/firebase/client'
import { Sparkles, X } from 'lucide-react'
import posthog from 'posthog-js'

interface PurchaseButtonProps {
  productId: string
  productName?: string
  children: React.ReactNode
  className?: string
  successRedirect?: string
  onSuccess?: () => void | Promise<void>
  /** Where the offer was shown, e.g. `tool:ai-face-rating`. Sent with every checkout event. */
  placement?: string
  /** Which offer this is, e.g. `glow_plan` or `pro`. */
  offer?: string
  /** Open the checkout once on mount: the visitor already clicked buy before signing up. */
  autoStart?: boolean
}

function SuccessModal({ productName, onClose }: { productName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[#222222] bg-black p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#666666] transition-colors hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl btn-gradient">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-white">Thank you!</h2>
        <p className="mb-1 text-[#888888]">
          Your <span className="font-semibold text-white">{productName}</span> purchase was successful.
        </p>
        <p className="mb-8 text-sm text-[#666666]">Aura Pro is being activated on your account.</p>

        <Link
          href="/dashboard"
          onClick={onClose}
          className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Open my glow-up
        </Link>
      </div>
    </div>
  )
}

/** The webhook grants Pro asynchronously; wait until the server sees it. */
export async function waitForPro(attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' })
      if (res.ok && (await res.json()).pro) return true
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  return false
}

export function PurchaseButton({
  productId,
  productName,
  children,
  className,
  successRedirect,
  onSuccess,
  placement,
  offer,
  autoStart = false
}: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [purchasedName, setPurchasedName] = useState('')
  const router = useRouter()
  const autoStarted = useRef(false)

  async function handlePurchase(auto = false) {
    setLoading(true)
    setError(null)
    const props = { product_id: productId, placement: placement ?? null, offer: offer ?? null }

    try {
      await auth.authStateReady()
      const user = auth.currentUser
      if (!user) throw new Error('Not logged in')
      // The RevenueCat webhook reports the verified sale under this id, so the
      // browser's anonymous visitor must be linked to it before paying.
      if (posthog.get_distinct_id() !== user.uid) posthog.identify(user.uid)

      const purchases = Purchases.configure(
        process.env.NEXT_PUBLIC_REVENUECAT_API_KEY!,
        user.uid
      )

      const offerings = await purchases.getOfferings()
      const allPackages = Object.values(offerings.all).flatMap((o) => o.availablePackages)
      const pkg = allPackages.find((p) => p.rcBillingProduct.identifier === productId)

      if (!pkg) {
        setError('Product not found. Please try again later.')
        posthog.capture('checkout_failed', { ...props, reason: 'product_not_found' })
        return
      }

      posthog.capture('checkout_started', { ...props, auto })
      await purchases.purchase({ rcPackage: pkg })

      const name = productName ?? pkg.rcBillingProduct.displayName ?? productId
      posthog.capture('purchase_completed', { ...props, product_name: name })

      if (onSuccess) {
        await onSuccess()
        return
      }

      if (successRedirect) {
        router.push(successRedirect)
        return
      }

      setPurchasedName(name)
      setShowSuccess(true)

      // Poll router.refresh() to pick up webhook-updated credits (webhook fires async)
      router.refresh()
      setTimeout(() => router.refresh(), 3000)
      setTimeout(() => router.refresh(), 7000)
    } catch (err) {
      if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) {
        posthog.capture('checkout_cancelled', props)
        return
      }
      setError('Something went wrong. Please try again.')
      posthog.capture('checkout_failed', {
        ...props,
        reason: err instanceof PurchasesError ? String(err.errorCode) : err instanceof Error ? err.message.slice(0, 120) : 'unknown'
      })
      console.error('[PurchaseButton]', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoStart || autoStarted.current) return
    autoStarted.current = true
    void handlePurchase(true)
    // Runs once, when the page decides the visitor is ready to pay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  return (
    <>
      {showSuccess && (
        <SuccessModal
          productName={purchasedName}
          onClose={() => setShowSuccess(false)}
        />
      )}
      <div className="w-full">
        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={loading}
          className={className}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </span>
            : children}
        </button>
        {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
      </div>
    </>
  )
}
