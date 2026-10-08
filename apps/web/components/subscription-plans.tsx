'use client'

import { PurchaseButton } from '@/components/purchase-button'
import { appConfig } from '@/lib/config'

export function SubscriptionPlans({
  successRedirect
}: {
  successRedirect?: string
}) {
  return (
    <section aria-label="Optional subscriptions" className="mt-10">
      <h2 className="mb-3 text-2xl font-bold">Want to keep exploring?</h2>
      <p className="mb-6 text-sm leading-relaxed text-white/60">
        Choose an optional subscription for regular reports and virtual try-ons.
        Both use the same monthly credit balance.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {appConfig.pricing.plans.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-7"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-fuchsia-300">
              {plan.name}
            </h3>
            <p className="my-5">
              <span className="text-5xl font-black">
                ${plan.price.toFixed(2)}
              </span>
              <span className="ml-2 text-sm text-white/60">
                / {plan.interval === 'yearly' ? 'year' : 'month'}
              </span>
            </p>
            <ul className="mb-7 flex-1 space-y-3 text-sm text-white/70">
              <li>{plan.credits} credits each month</li>
              <li>
                Up to {Math.floor(plan.credits / appConfig.credits.toolReport)}{' '}
                tool reports, or a mix with try-ons
              </li>
              <li>
                Tool report: {appConfig.credits.toolReport} credits · Try-on:{' '}
                {appConfig.credits.haircutTryOn} credits
              </li>
              <li>
                Face, hairstyle, women’s styling and glow-up planner tools
              </li>
              <li>Unused monthly credits do not roll over</li>
            </ul>
            <PurchaseButton
              productId={plan.rcProductId}
              productName={plan.name}
              successRedirect={successRedirect}
              className="w-full rounded-xl border border-fuchsia-400/40 px-5 py-3 font-bold hover:bg-white/5"
            >
              Choose {plan.name.toLowerCase()}
            </PurchaseButton>
            <p className="mt-4 text-xs leading-relaxed text-white/50">
              ${plan.price.toFixed(2)} billed{' '}
              {plan.interval === 'yearly' ? 'yearly' : 'monthly'}. Renews until
              cancelled. Cancel before renewal to stop the next charge.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
