'use client'

import { useState } from 'react'
import { Check, Zap } from 'lucide-react'
import { PurchaseButton } from '@/components/purchase-button'
import { appConfig } from '@/lib/config'

// TODO: Replace with your actual plans from appConfig.pricing.plans
const PLANS = appConfig.pricing.plans.length > 0
  ? appConfig.pricing.plans.map((p) => ({
      name: p.name,
      monthly: p.interval === 'monthly' ? p.price : 0,
      yearly: p.interval === 'yearly' ? p.price : 0,
      monthlyProductId: p.interval === 'monthly' ? p.rcProductId : '',
      yearlyProductId: p.interval === 'yearly' ? p.rcProductId : '',
      credits: p.credits.toLocaleString(),
      popular: false,
      description: `${p.credits.toLocaleString()} credits per month with all features.`,
      features: [`${p.credits.toLocaleString()} credits / month`, 'All AI models'],
    }))
  : [] as Array<{
      name: string
      monthly: number
      yearly: number
      monthlyProductId: string
      yearlyProductId: string
      credits: string
      popular: boolean
      description: string
      features: string[]
    }>

const CREDIT_PACKS = appConfig.pricing.creditPacks.map((p) => ({
  productId: p.rcProductId,
  name: `${p.credits.toLocaleString()} Credits`,
  price: `$${p.price.toFixed(2)}`,
  popular: false,
  credits: p.credits.toLocaleString(),
  description: `${p.credits.toLocaleString()} credits, never expire.`,
  features: [`${p.credits.toLocaleString()} credits, never expire`, 'All AI models', 'Stacks with subscription credits'],
}))

type Tab = 'monthly' | 'yearly' | 'credits'

export default function OnboardingPricingPage() {
  const [tab, setTab] = useState<Tab>('monthly')

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">Choose your plan</h1>
        <p className="text-[#888] text-base">
          Start generating today. Cancel anytime.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex rounded-xl border border-[#222] bg-black p-1 mb-8">
        <button
          type="button"
          onClick={() => setTab('monthly')}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${tab === 'monthly' ? 'bg-white text-black' : 'text-white/50 hover:text-white/70'}`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setTab('yearly')}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${tab === 'yearly' ? 'bg-white text-black' : 'text-white/50 hover:text-white/70'}`}
        >
          Yearly
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === 'yearly' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-emerald-500/10 text-emerald-500'}`}>
            Save 50%
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('credits')}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${tab === 'credits' ? 'bg-white text-black' : 'text-white/50 hover:text-white/70'}`}
        >
          Buy Credits
        </button>
      </div>

      {/* Plan cards */}
      {tab !== 'credits' && (
        <div className="grid gap-4 text-left sm:grid-cols-3 w-full max-w-4xl">
          {PLANS.length === 0 && (
            <div className="col-span-3 text-center text-[#666] py-16">
              <p className="text-white font-medium mb-2">No plans configured yet</p>
              <p className="text-sm">Add your plans to <code className="text-purple-400">config/app.config.ts</code></p>
            </div>
          )}
          {PLANS.map((plan) => (
            <div key={plan.name} className="relative flex flex-col rounded-2xl border border-[#222] bg-[#0a0a0a] p-6">
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="btn-gradient rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg">Best Value</span>
                </div>
              )}
              <h2 className="text-lg font-bold text-white mb-1">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-4xl font-extrabold text-white">
                  ${tab === 'yearly' ? (plan.yearly / 12).toFixed(2) : plan.monthly}
                </span>
                <span className="text-sm text-[#666]">/mo</span>
              </div>
              <p className="text-xs text-[#666] mb-1">
                {tab === 'yearly' ? `billed $${plan.yearly} yearly` : 'billed monthly'}
              </p>
              <p className="text-sm text-[#888] mb-5">{plan.description}</p>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 mb-5">
                <Zap className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold text-white">{plan.credits}</span>
                <span className="text-sm text-[#888]">credits / month</span>
              </div>
              <PurchaseButton
                productId={tab === 'yearly' ? plan.yearlyProductId : plan.monthlyProductId}
                productName={`${plan.name} ${tab === 'yearly' ? 'Yearly' : 'Monthly'}`}
                successRedirect="/onboarding/welcome"
                className="mb-6 w-full rounded-full py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 btn-gradient text-white"
              >
                Subscribe
              </PurchaseButton>
              <ul className="flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-sm text-[#ccc]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Credit pack cards */}
      {tab === 'credits' && (
        <div className="grid gap-4 text-left sm:grid-cols-2 w-full max-w-2xl">
          {CREDIT_PACKS.length === 0 && (
            <div className="col-span-2 text-center text-[#666] py-16">
              <p className="text-white font-medium mb-2">No credit packs configured yet</p>
              <p className="text-sm">Add your credit packs to <code className="text-purple-400">config/app.config.ts</code></p>
            </div>
          )}
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.productId} className="relative flex flex-col rounded-2xl border border-[#222] bg-[#0a0a0a] p-6">
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="btn-gradient rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg">Best Value</span>
                </div>
              )}
              <h2 className="text-lg font-bold text-white mb-1">{pack.name}</h2>
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-4xl font-extrabold text-white">{pack.price}</span>
              </div>
              <p className="text-xs text-[#666] mb-1">one-time purchase</p>
              <p className="text-sm text-[#888] mb-5">{pack.description}</p>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 mb-5">
                <Zap className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold text-white">{pack.credits}</span>
                <span className="text-sm text-[#888]">credits</span>
              </div>
              <PurchaseButton
                productId={pack.productId}
                productName={pack.name}
                successRedirect="/onboarding/welcome"
                className="mb-6 w-full rounded-full py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 btn-gradient text-white"
              >
                Buy Credits
              </PurchaseButton>
              <ul className="flex flex-col gap-2.5">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-sm text-[#ccc]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#555] mt-8">Billed via Stripe · Cancel anytime</p>
    </div>
  )
}
