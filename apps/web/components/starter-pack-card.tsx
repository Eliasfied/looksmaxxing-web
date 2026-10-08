'use client'

import { PurchaseButton } from '@/components/purchase-button'
import { appConfig } from '@/lib/config'

const pack = appConfig.pricing.creditPacks[0]

export function StarterPackCard({
  successRedirect
}: {
  successRedirect?: string
}) {
  if (!pack) return null

  return (
    <div className="relative mb-5 flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0a0a0a] p-7 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#666]">
          One full tool report
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white">${pack.price}</span>
          <span className="text-sm text-[#888]">one-time payment</span>
        </div>
        <p className="mt-2 text-xs text-[#555]">
          {pack.credits} credits — enough for one full tool report. No
          subscription, no renewal.
        </p>
      </div>

      <PurchaseButton
        productId={pack.rcProductId}
        productName="One report"
        successRedirect={successRedirect}
        className="shrink-0 rounded-full border border-white/15 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/5 sm:w-auto"
      >
        Get one report — ${pack.price.toFixed(2)}
      </PurchaseButton>
    </div>
  )
}
