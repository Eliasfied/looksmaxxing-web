'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ScanFace, Wand2, ListChecks, LineChart, ShieldCheck } from 'lucide-react'
import posthog from 'posthog-js'
import { PurchaseButton, waitForPro } from '@/components/purchase-button'
import { PRO_PILLARS, PRO_PLANS, yearlySaving } from '@/lib/pro-features'
import { cn } from '@/lib/utils'

const ICONS = { analyze: ScanFace, try: Wand2, do: ListChecks, track: LineChart } as const

export function ProPaywall({
  signedIn,
  returnTo,
  headline = 'Unlock your full glow-up',
  subline = 'Everything in one plan: analyze, try on, follow and track.',
  placement,
  onActivated,
  compact = false,
  pillars = true,
  id
}: {
  signedIn: boolean
  /** Where to come back to after sign-up and checkout. */
  returnTo: string
  headline?: string
  subline?: string
  placement: string
  onActivated?: () => void | Promise<void>
  compact?: boolean
  /** Hide the feature list when the surrounding page already explains it. */
  pillars?: boolean
  id?: string
}) {
  const router = useRouter()
  const [interval, setBilling] = useState<'yearly' | 'monthly'>('yearly')
  const [activating, setActivating] = useState(false)
  const [stuck, setStuck] = useState(false)
  const plan = PRO_PLANS.find((p) => p.interval === interval) ?? PRO_PLANS[0]
  const saving = yearlySaving()

  async function activated() {
    setActivating(true)
    const ok = await waitForPro()
    setActivating(false)
    if (!ok) {
      setStuck(true)
      return
    }
    posthog.capture('pro_activated', { placement, plan: plan.id })
    if (onActivated) await onActivated()
    else {
      router.push(returnTo)
      router.refresh()
    }
  }

  return (
    <section
      id={id}
      aria-label="Aura Pro"
      className="relative scroll-mt-24 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0b14] p-6 shadow-[0_0_80px_-20px_rgba(192,38,211,0.45)] sm:p-9"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-600/30 via-violet-600/25 to-sky-500/20 blur-3xl"
      />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200">
          Aura Pro
        </p>
        <h2 className={cn('mt-4 font-black leading-tight', compact ? 'text-2xl' : 'text-3xl sm:text-4xl')}>
          {headline}
        </h2>
        <p className="mt-2 text-white/60">{subline}</p>

        {pillars && <div className={cn('mt-7 grid gap-3', !compact && 'sm:grid-cols-2')}>
          {PRO_PILLARS.map((pillar) => {
            const Icon = ICONS[pillar.key]
            return (
              <div key={pillar.key} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-violet-500/30">
                  <Icon className="h-4 w-4 text-fuchsia-100" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-bold">{pillar.line}</span>
                  {!compact && <span className="mt-0.5 block text-xs leading-relaxed text-white/50">{pillar.detail}</span>}
                </span>
              </div>
            )
          })}
        </div>}

        <div className="mt-7 inline-flex rounded-full border border-white/10 bg-black/40 p-1" role="radiogroup" aria-label="Billing period">
          {(['yearly', 'monthly'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={interval === value}
              onClick={() => setBilling(value)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-bold transition',
                interval === value ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              )}
            >
              {value === 'yearly' ? 'Yearly' : 'Monthly'}
              {value === 'yearly' && saving > 0 && (
                <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[11px]', interval === value ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-500/20 text-fuchsia-200')}>
                  −{saving}%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <p>
            <span className="text-5xl font-black tracking-tight">${plan.monthly.toFixed(2)}</span>
            <span className="ml-2 text-white/55">/ month</span>
            <span className="mt-1 block text-sm text-white/45">
              {interval === 'yearly' ? `$${plan.price.toFixed(2)} billed once a year` : 'Billed monthly'} · cancel anytime
            </span>
          </p>
          <div className="w-full sm:w-auto sm:min-w-64">
            {signedIn ? (
              <PurchaseButton
                productId={plan.rcProductId}
                productName={`Aura Pro ${plan.name}`}
                onSuccess={activated}
                className="btn-gradient w-full rounded-2xl px-8 py-4 text-lg font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:brightness-110 disabled:opacity-60"
              >
                {activating ? 'Activating Pro…' : 'Get Aura Pro'}
              </PurchaseButton>
            ) : (
              <Link
                href={`/register?next=${encodeURIComponent(returnTo)}`}
                onClick={() => posthog.capture('tool_unlock_clicked', { placement })}
                className="btn-gradient block w-full rounded-2xl px-8 py-4 text-center text-lg font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:brightness-110"
              >
                Get Aura Pro
              </Link>
            )}
          </div>
        </div>
        {stuck && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
            Your payment went through, but Pro is still being activated. Refresh this page in a minute; please do not pay again.
          </p>
        )}
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45">
          {['Secure checkout by Stripe', 'Cancel in settings before renewal', 'Photos are never sold or shared'].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              {t.startsWith('Secure') ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Small inline nudge for places where a full paywall would be too much. */
export function UpgradeNudge({ text = 'This is part of Aura Pro.' }: { text?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-400/25 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 p-4">
      <p className="text-sm font-semibold text-white">{text}</p>
      <Link href="/pricing" className="btn-gradient rounded-full px-5 py-2 text-sm font-bold text-white">
        See Aura Pro
      </Link>
    </div>
  )
}
