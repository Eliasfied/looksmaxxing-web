import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { ProSales } from '@/components/pro-sales'

export default async function OnboardingPricingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/onboarding/pricing')
  if ((await getPlan(user.id)).pro) redirect('/dashboard')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <ProSales
        signedIn
        returnTo="/dashboard?welcome=1"
        placement="onboarding"
        intro="Your free preview is ready. Here is everything Pro adds on top."
      />
      <p className="mt-6 text-center text-xs text-white/40">
        Checkout shows the final price and any applicable taxes. Subscriptions renew until cancelled.
      </p>
    </div>
  )
}
