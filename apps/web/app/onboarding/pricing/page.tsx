import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { ProPaywall } from '@/components/pro-paywall'

export default async function OnboardingPricingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/onboarding/pricing')
  if ((await getPlan(user.id)).pro) redirect('/dashboard')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <ProPaywall
        signedIn
        returnTo="/dashboard?welcome=1"
        placement="onboarding"
        headline="Your preview is ready. Now get the full picture."
        subline="Your scan, your plan and your try-ons, all in one place."
      />
      <p className="mt-6 text-center text-xs text-white/40">
        Checkout shows the final price and any applicable taxes. Subscriptions renew until cancelled.
      </p>
    </div>
  )
}
