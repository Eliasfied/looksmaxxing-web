import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { ProPaywall } from '@/components/pro-paywall'

export default async function PricingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/pricing')
  const plan = await getPlan(user.id)

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      {plan.pro ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Aura Pro is active</p>
          <h1 className="mt-3 text-3xl font-black">You have everything unlocked.</h1>
          <p className="mt-3 text-white/60">
            {plan.cancelAtPeriodEnd && plan.periodEnd
              ? `Your plan ends on ${new Date(plan.periodEnd).toLocaleDateString('en-US')}.`
              : 'Manage or cancel your plan in settings.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" className="btn-gradient rounded-full px-6 py-3 font-bold text-white">Open my glow-up</Link>
            <Link href="/settings" className="rounded-full border border-white/15 px-6 py-3 font-bold text-white/80">Settings</Link>
          </div>
        </div>
      ) : (
        <ProPaywall signedIn returnTo="/dashboard" placement="pricing" />
      )}
      <p className="mt-6 text-center text-xs text-white/40">
        Checkout shows the final price and any applicable taxes. Subscriptions renew until cancelled.
      </p>
    </div>
  )
}
