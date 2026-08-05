'use client'

import { PurchaseButton } from '@/components/purchase-button'
import { appConfig } from '@/lib/config'

const pack = appConfig.pricing.creditPacks[0]

export function StarterPackCard({ successRedirect }: { successRedirect?: string }) {
  if (!pack) return null

  return (
    <div className="relative mb-5 flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0a0a0a] p-7 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#666]">
          Just want to see your results?
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white">${pack.price}</span>
          <span className="text-sm text-[#555]">one-time · {pack.credits} credits</span>
        </div>
        <p className="mt-2 text-xs text-[#555]">
          Unlocks one full analysis. No subscription, no renewal.
        </p>
      </div>

      <PurchaseButton
        productId={pack.rcProductId}
        productName={pack.name}
        successRedirect={successRedirect}
        className="shrink-0 rounded-full border border-white/15 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/5 sm:w-auto"
      >
        Get {pack.credits} credits
      </PurchaseButton>
    </div>
  )
}
