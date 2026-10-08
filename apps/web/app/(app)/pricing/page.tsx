import Link from 'next/link'
import { StarterPackCard } from '@/components/starter-pack-card'
import { SubscriptionPlans } from '@/components/subscription-plans'

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-fuchsia-300">
          Preview first. Decide afterwards.
        </p>
        <h1 className="text-4xl font-black sm:text-5xl">
          Start with one report.
        </h1>
        <p className="mt-5 text-white/60">
          $2.99 once. An ongoing plan is there when you need it.
        </p>
        <Link
          href="/tools"
          className="mt-5 inline-block text-sm font-semibold text-fuchsia-300"
        >
          Try a free potential preview →
        </Link>
      </div>
      <StarterPackCard />
      <SubscriptionPlans />
      <p className="mt-8 text-center text-xs text-white/50">
        Checkout shows the final price and any applicable taxes.
      </p>
    </div>
  )
}
