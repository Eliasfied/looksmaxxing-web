'use client'

import { PurchaseButton } from '@/components/purchase-button'
import { StarterPackCard } from '@/components/starter-pack-card'

const features = [
  'AI Face Analysis',
  'AI Face Analysis Illustration',
  'Personalized Glow Up Plan',
  'AI Looksmaxxing Chat Access',
  'AI Hairstyle, Beard & Glasses Try-On (50x/mo)',
]

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function OnboardingPricingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">

      {/* Heading */}
      <div className="text-center mb-12">
        <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Choose your plan</p>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          One plan.<br />
          <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            Everything included.
          </span>
        </h1>
        <p className="text-[#888] mt-5 text-base">Start today. Cancel anytime.</p>
      </div>

      <StarterPackCard successRedirect="/dashboard" />

      {/* Two cards */}
      <div className="grid sm:grid-cols-2 gap-5">

        {/* Monthly */}
        <div className="relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-7">
          <p className="text-[#666] text-xs font-bold uppercase tracking-widest mb-5">Monthly</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-5xl font-black text-white">$9.99</span>
            <span className="text-[#555] text-sm">/mo</span>
          </div>
          <p className="text-[#555] text-xs mb-8">billed monthly</p>
          <PurchaseButton
            productId="aura_monthly"
            productName="Monthly"
            successRedirect="/onboarding/welcome"
            className="w-full text-center rounded-full py-3.5 text-sm font-bold border border-white/15 text-white hover:bg-white/5 transition-colors mb-8"
          >
            Get Started
          </PurchaseButton>
          <ul className="flex flex-col gap-3">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckIcon />
                <span className="text-sm text-[#aaa]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Yearly */}
        <div className="relative flex flex-col rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/15 to-violet-900/5 p-7">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="btn-gradient rounded-full px-4 py-1 text-[10px] font-bold text-white tracking-widest uppercase shadow-lg whitespace-nowrap">Save 58%</span>
          </div>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-5">Yearly</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-5xl font-black text-white">$49.99</span>
            <span className="text-[#555] text-sm">/yr</span>
          </div>
          <p className="text-[#555] text-xs mb-8">
            billed once a year · <span className="text-green-400 font-semibold">~$4.17/mo</span>
          </p>
          <PurchaseButton
            productId="aura_yearly"
            productName="Yearly"
            successRedirect="/onboarding/welcome"
            className="w-full text-center rounded-full py-3.5 text-sm font-bold btn-gradient text-white hover:opacity-90 transition-opacity mb-8"
          >
            Get Started
          </PurchaseButton>
          <ul className="flex flex-col gap-3">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckIcon />
                <span className="text-sm text-[#aaa]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <p className="text-xs text-[#444] text-center mt-8">Cancel anytime · Secure payment</p>
    </div>
  )
}
