'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Purchases, PurchasesError, ErrorCode } from '@revenuecat/purchases-js'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, X } from 'lucide-react'
import posthog from 'posthog-js'

interface PurchaseButtonProps {
  productId: string
  productName?: string
  children: React.ReactNode
  className?: string
  successRedirect?: string
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
        <p className="mb-8 text-sm text-[#666666]">Credits are being added to your account.</p>

        <Link
          href="/generate"
          onClick={onClose}
          className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Start Generating
        </Link>
      </div>
    </div>
  )
}

export function PurchaseButton({ productId, productName, children, className, successRedirect }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [purchasedName, setPurchasedName] = useState('')
  const router = useRouter()

  async function handlePurchase() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const purchases = Purchases.configure(
        process.env.NEXT_PUBLIC_REVENUECAT_API_KEY!,
        user.id
      )

      const offerings = await purchases.getOfferings()
      const allPackages = Object.values(offerings.all).flatMap((o) => o.availablePackages)
      const pkg = allPackages.find((p) => p.rcBillingProduct.identifier === productId)

      if (!pkg) {
        setError('Product not found. Please try again later.')
        return
      }

      await purchases.purchase({ rcPackage: pkg })

      const name = productName ?? pkg.rcBillingProduct.displayName ?? productId
      posthog.capture('purchase_completed', { product_id: productId, product_name: name })

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
        return
      }
      setError('Something went wrong. Please try again.')
      console.error('[PurchaseButton]', err)
    } finally {
      setLoading(false)
    }
  }

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
          onClick={handlePurchase}
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
