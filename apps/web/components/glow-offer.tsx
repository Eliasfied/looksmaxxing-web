'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ShieldCheck, Sparkles } from 'lucide-react'
import posthog from 'posthog-js'
import { PurchaseButton, waitForPro } from '@/components/purchase-button'
import { GLOW, GLOW_DISCOUNT, GLOW_INCLUDES, usd } from '@/lib/glow-offer'
import { PRO_PLANS } from '@/lib/pro-features'
import { cn } from '@/lib/utils'

export function GlowPrice({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {GLOW_DISCOUNT > 0 && (
        <span className={cn('font-bold text-white/40 line-through decoration-white/40', size === 'lg' ? 'text-2xl' : 'text-base')}>
          {usd(GLOW.compareAtPrice!)}
        </span>
      )}
      <span className={cn('font-black tracking-tight', size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl')}>{usd(GLOW.price)}</span>
      {GLOW_DISCOUNT > 0 && (
        <span className="rounded-full bg-fuchsia-500 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">
          −{GLOW_DISCOUNT}%
        </span>
      )}
    </p>
  )
}

/** The main offer everywhere in the app: the one-time 30-day plan. */
export function GlowOffer({
  signedIn,
  returnTo = '/glow-up',
  placement,
  headline = 'Your 30-Day Glow-Up Plan',
  intro,
  onActivated,
  beforeCheckout,
  compact = false,
  id
}: {
  signedIn: boolean
  returnTo?: string
  placement: string
  headline?: string
  intro?: string
  onActivated?: () => void | Promise<void>
  beforeCheckout?: () => void
  compact?: boolean
  id?: string
}) {
  const router = useRouter()
  const [activating, setActivating] = useState(false)
  const [stuck, setStuck] = useState(false)
  const yearly = PRO_PLANS.find((p) => p.interval === 'yearly')

  async function activated() {
    setActivating(true)
    const ok = await waitForPro()
    setActivating(false)
    if (!ok) return setStuck(true)
    posthog.capture('glow_plan_activated', { placement })
    if (onActivated) await onActivated()
    else {
      router.push(returnTo)
      router.refresh()
    }
  }

  const cta = activating ? 'Activating your plan…' : 'Start my 30-day plan'
  const ctaClass =
    'btn-gradient block w-full rounded-2xl px-8 py-4 text-center text-lg font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:brightness-110 disabled:opacity-60'

  return (
    <section
      id={id}
      aria-label="30-Day Glow-Up Plan"
      onClickCapture={beforeCheckout}
      className="relative scroll-mt-24 overflow-hidden rounded-[2rem] border border-fuchsia-400/30 bg-[#0d0b14] p-6 shadow-[0_0_80px_-20px_rgba(192,38,211,0.5)] sm:p-9"
    >
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-600/30 via-violet-600/25 to-sky-500/20 blur-3xl" />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> One-time · no subscription
        </p>
        <h2 className={cn('mt-4 font-black leading-tight', compact ? 'text-2xl' : 'text-3xl sm:text-4xl')}>{headline}</h2>
        {intro && <p className="mt-2 text-white/60">{intro}</p>}

        <ul className={cn('mt-6 grid gap-2.5', !compact && 'sm:grid-cols-2')}>
          {GLOW_INCLUDES.map(([title, detail]) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden />
              <span>
                <span className="block text-sm font-bold">{title}</span>
                {!compact && <span className="mt-0.5 block text-xs leading-relaxed text-white/50">{detail}</span>}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <GlowPrice size={compact ? 'sm' : 'lg'} />
            <p className="mt-1 text-sm text-white/50">Pay once · {GLOW.accessDays} days of full access · plan &amp; PDF are yours to keep</p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-72">
            {signedIn ? (
              <PurchaseButton productId={GLOW.rcProductId} productName={GLOW.name} onSuccess={activated} className={ctaClass}>
                {cta}
              </PurchaseButton>
            ) : (
              <Link
                href={`/register?next=${encodeURIComponent(returnTo)}`}
                onClick={() => posthog.capture('tool_unlock_clicked', { placement, offer: 'glow_plan' })}
                className={ctaClass}
              >
                {cta}
              </Link>
            )}
          </div>
        </div>
        {stuck && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
            Your payment went through, but the plan is still being activated. Refresh this page in a minute; please do not pay again.
          </p>
        )}
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Secure checkout by Stripe
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" aria-hidden /> No renewal, nothing to cancel
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" aria-hidden /> For men and women
          </li>
        </ul>
        {yearly && (
          <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-white/45">
            Want ongoing access instead?{' '}
            <Link href="/pricing#aura-pro" className="font-semibold text-fuchsia-300 hover:text-fuchsia-200">
              Aura Pro from {usd(yearly.monthly)} / month
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
