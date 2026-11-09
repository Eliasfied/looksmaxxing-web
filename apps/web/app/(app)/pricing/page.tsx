import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { ProSales } from '@/components/pro-sales'
import { GlowOffer } from '@/components/glow-offer'

export default async function PricingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/pricing')
  const plan = await getPlan(user.id)

  return (
    <div className="mx-auto w-full space-y-16 py-4">
      {plan.subscribed ? (
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center">
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
        <>
          {plan.glow?.active ? (
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-fuchsia-400/30 bg-white/[0.03] p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Your 30-day plan is active</p>
              <h1 className="mt-3 text-3xl font-black">Every feature is unlocked until {new Date(plan.glow.accessUntil).toLocaleDateString('en-US')}.</h1>
              <p className="mt-3 text-white/60">Want to keep going after that? Aura Pro continues everything below.</p>
              <Link href="/glow-up" className="btn-gradient mt-6 inline-flex rounded-full px-6 py-3 font-bold text-white">Open my plan</Link>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <h1 className="sr-only">Pricing</h1>
              <GlowOffer signedIn placement="pricing" />
            </div>
          )}
          <div id="aura-pro" className="scroll-mt-10">
            <p className="mb-6 text-center text-sm font-semibold text-white/50">Prefer ongoing access? Aura Pro is a subscription.</p>
            <ProSales signedIn returnTo="/dashboard" placement="pricing" />
          </div>
        </>
      )}
      <p className="text-center text-xs text-white/40">
        Checkout shows the final price and any applicable taxes. The 30-day plan is a one-time payment. Subscriptions renew until cancelled.
      </p>
    </div>
  )
}
