'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { PurchaseButton } from '@/components/purchase-button'
import type { ToolDefinition, ToolReport } from '@/lib/tool-report'
import { appConfig } from '@/lib/config'

function subscribeChecklist(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('aura-checklist-change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('aura-checklist-change', callback)
  }
}

export function ToolResult({
  id,
  tool,
  potentialScore,
  signedIn,
  initialReport,
  checkoutRequested = false
}: {
  id: string
  tool: ToolDefinition
  potentialScore: number
  signedIn: boolean
  initialReport: ToolReport | null
  checkoutRequested?: boolean
}) {
  const [report, setReport] = useState(initialReport),
    [checkout, setCheckout] = useState(false),
    [error, setError] = useState(''),
    [waiting, setWaiting] = useState(false)
  const checklistJson = useSyncExternalStore(
    subscribeChecklist,
    () => {
      try {
        return localStorage.getItem(`aura-checklist-${id}`) ?? '{}'
      } catch {
        return '{}'
      }
    },
    () => '{}'
  )
  let completed: Record<string, boolean> = {}
  try {
    const saved = JSON.parse(checklistJson)
    if (saved && typeof saved === 'object' && !Array.isArray(saved))
      completed = saved
  } catch {
    /* unavailable local storage */
  }
  const [claimed, setClaimed] = useState(Boolean(initialReport)),
    [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const active = useRef(true)
  const returnPath = `/tools/result/${id}?checkout=1`
  const unlock = useCallback(
    async (waitForPayment = false) => {
      if (waitForPayment) {
        setPaymentSubmitted(true)
        try {
          localStorage.setItem(`aura-payment-${id}`, 'pending')
        } catch {
          /* optional persistence */
        }
      }
      setWaiting(true)
      setError('')
      try {
        for (let attempt = 0; attempt < (waitForPayment ? 20 : 1); attempt++) {
          const response = await fetch(`/api/tools/reports/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unlock' })
          })
          if (!active.current) return
          if (response.ok) {
            const full = await fetch(`/api/tools/reports/${id}`, {
              cache: 'no-store'
            })
            const data = await full.json()
            if (!full.ok || !data.unlocked || !data.report)
              throw new Error(
                'Your report is not ready yet. Please refresh this page.'
              )
            setReport(data.report)
            setCheckout(false)
            try {
              localStorage.removeItem(`aura-payment-${id}`)
            } catch {
              /* optional persistence */
            }
            posthog.capture('tool_report_unlocked', { tool: tool.slug })
            return
          }
          if (response.status !== 402)
            throw new Error('Please sign in again to open this report.')
          if (!waitForPayment) {
            setCheckout(true)
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }
        throw new Error(
          'Your payment is still being confirmed. Use “Check payment” below; please do not pay again.'
        )
      } catch (e) {
        if (active.current)
          setError(e instanceof Error ? e.message : 'Please try again.')
      } finally {
        if (active.current) setWaiting(false)
      }
    },
    [id, tool.slug]
  )
  useEffect(() => {
    active.current = true
    posthog.capture(
      initialReport ? 'tool_report_viewed' : 'tool_preview_viewed',
      {
        tool: tool.slug
      }
    )
    if (signedIn && !initialReport) {
      fetch(`/api/tools/reports/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' })
      })
        .then((response) => {
          if (!response.ok)
            throw new Error(
              'Unable to save your report. Please refresh before paying.'
            )
          if (active.current) {
            setClaimed(true)
            let pending = false
            try {
              pending = localStorage.getItem(`aura-payment-${id}`) === 'pending'
            } catch {
              /* optional persistence */
            }
            // A normal preview visit must never spend an existing buyer's credits.
            if (pending || checkoutRequested) void unlock(pending)
          }
        })
        .catch((e) => {
          if (active.current) setError(e.message)
        })
    }
    return () => {
      active.current = false
    }
  }, [id, initialReport, signedIn, tool.slug, unlock, checkoutRequested])

  async function beginCheckout() {
    posthog.capture('tool_unlock_clicked', { tool: tool.slug })
    await unlock()
  }
  function toggleTask(key: string) {
    const next = { ...completed, [key]: !completed[key] }
    try {
      localStorage.setItem(`aura-checklist-${id}`, JSON.stringify(next))
      window.dispatchEvent(new Event('aura-checklist-change'))
    } catch {
      /* optional persistence */
    }
  }
  return (
    <div className={`mx-auto max-w-3xl ${report ? '' : 'pb-20 sm:pb-0'}`}>
      <p className="text-sm font-semibold uppercase tracking-widest text-fuchsia-300">
        {tool.name}
      </p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
        {report ? 'Your report is ready.' : 'Your next look starts here.'}
      </h1>
      <div className="my-8 rounded-3xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-600/15 to-violet-700/10 p-8 text-center">
        <p className="text-sm text-white/70">Estimated styling potential</p>
        <p className="my-3 text-7xl font-bold">
          {potentialScore.toFixed(1)}
          <span className="text-2xl text-white/40"> / 10</span>
        </p>
        <p className="mx-auto max-w-md text-sm text-white/60">
          A subjective AI estimate, influenced by this photo. It is not a
          promise of improvement or a measure of your worth.
        </p>
      </div>
      {report ? (
        <>
          <h2 className="mb-6 text-2xl font-bold">{report.headline}</h2>
          <div className="space-y-5">
            {report.sections.map((section, i) => (
              <section
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="text-xl font-bold">{section.title}</h3>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-white/70">
                  {section.text}
                </p>
                {section.tasks && (
                  <ul className="mt-4 space-y-3">
                    {section.tasks.map((task, j) => (
                      <li key={j}>
                        <label className="flex items-start gap-3 text-white/75">
                          <input
                            type="checkbox"
                            checked={Boolean(completed[`${i}-${j}`])}
                            onChange={() => toggleTask(`${i}-${j}`)}
                            className="mt-1"
                          />
                          <span>{task}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-white/55">
            {report.limitations}
          </p>
          <p className="mt-3 text-xs text-white/40">
            Checklist progress is saved in this browser.
          </p>
          <div className="mt-8 flex flex-wrap gap-5">
            <Link href="/tools" className="font-semibold text-fuchsia-300">
              Explore another tool →
            </Link>
            <Link href="/dashboard" className="text-white/70">
              Your account
            </Link>
            <button onClick={() => window.print()} className="text-white/70">
              Print / save PDF
            </button>
          </div>
          <aside className="mt-8 rounded-2xl border border-white/10 p-6 print:hidden">
            <h2 className="text-lg font-bold">Build on your report</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Explore hairstyles, a personal glow-up plan or progress
              comparisons. An optional subscription starts at $9.99/month with
              100 monthly credits for up to{' '}
              {Math.floor(100 / appConfig.credits.toolReport)} reports or a mix
              with try-ons.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block text-sm font-semibold text-fuchsia-300"
            >
              Explore optional plans →
            </Link>
          </aside>
        </>
      ) : (
        <>
          <div className="space-y-3">
            {tool.resultLabels.map((label) => (
              <section
                key={label}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h2 className="font-semibold">{label}</h2>
                <div
                  aria-hidden="true"
                  className="mt-4 select-none space-y-2 blur-sm"
                >
                  <div className="h-3 w-11/12 rounded bg-white/20" />
                  <div className="h-3 w-9/12 rounded bg-white/20" />
                  <div className="h-3 w-10/12 rounded bg-white/10" />
                </div>
                <span className="absolute right-5 top-5 text-xs text-white/50">
                  Locked
                </span>
              </section>
            ))}
          </div>
          <div
            id="report-unlock"
            className="mt-7 scroll-mt-6 rounded-2xl border border-fuchsia-300/25 bg-[#14101c] p-6 text-center"
          >
            <h2 className="text-2xl font-bold">Make the result useful.</h2>
            <p className="mt-2 text-white/65">
              Get the full explanation and personal suggestions for $2.99 once.
              No subscription required.
            </p>
            {!signedIn ? (
              <Link
                onClick={() =>
                  posthog.capture('tool_unlock_clicked', { tool: tool.slug })
                }
                href={`/register?next=${encodeURIComponent(returnPath)}`}
                className="mt-6 block rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-4 font-bold"
              >
                Unlock my report — $2.99
              </Link>
            ) : !claimed ? (
              <p className="mt-6 text-sm text-white/60">
                Saving your report to your account…
              </p>
            ) : !checkout ? (
              <>
                <button
                  onClick={() => void beginCheckout()}
                  disabled={waiting}
                  className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-4 font-bold disabled:opacity-50"
                >
                  {waiting ? 'Checking your access…' : 'Unlock my report'}
                </button>
                <p className="mt-3 text-xs text-white/50">
                  Uses {appConfig.credits.toolReport} credits if you already
                  have a paid balance. Otherwise choose a purchase next.
                </p>
              </>
            ) : (
              <div className="mt-6 space-y-4">
                {!paymentSubmitted && (
                  <>
                    <PurchaseButton
                      productId="aura_starter_pack"
                      productName="Full report"
                      onSuccess={() => unlock(true)}
                      className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-4 font-bold"
                    >
                      Unlock for $2.99 once
                    </PurchaseButton>
                    <details className="rounded-xl border border-white/10 p-4 text-left">
                      <summary className="cursor-pointer text-sm text-white/70">
                        Prefer a subscription?
                      </summary>
                      <p className="my-3 text-sm text-white/60">
                        100 credits each month: up to{' '}
                        {Math.floor(100 / appConfig.credits.toolReport)} tool
                        reports, or a mix with try-ons. A report uses{' '}
                        {appConfig.credits.toolReport} credits; a try-on uses{' '}
                        {appConfig.credits.haircutTryOn}. Unused monthly credits
                        do not roll over. Subscriptions renew until cancelled.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <PurchaseButton
                          productId="aura_monthly"
                          productName="Monthly plan"
                          onSuccess={() => unlock(true)}
                          className="w-full rounded-lg border border-white/20 p-3 text-sm"
                        >
                          $9.99 / month
                        </PurchaseButton>
                        <PurchaseButton
                          productId="aura_yearly"
                          productName="Yearly plan"
                          onSuccess={() => unlock(true)}
                          className="w-full rounded-lg border border-white/20 p-3 text-sm"
                        >
                          $49.99 / year
                        </PurchaseButton>
                      </div>
                    </details>
                  </>
                )}
                {paymentSubmitted && (
                  <p className="text-sm text-white/70">
                    Payment submitted. We are waiting for confirmation; you do
                    not need to pay again.
                  </p>
                )}
                <button
                  onClick={() => void unlock(paymentSubmitted)}
                  disabled={waiting}
                  className="text-sm text-white/60 underline"
                >
                  {waiting
                    ? 'Confirming payment…'
                    : 'Check payment / use existing credits'}
                </button>
              </div>
            )}
            {!signedIn && (
              <p className="mt-3 text-xs text-white/50">
                Next: sign in or create your account, then pay. Your report
                stays with you.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-white/10 bg-[#14101c]/95 px-5 py-4 backdrop-blur sm:hidden print:hidden">
            <div>
              <p className="text-sm font-bold">Your full report</p>
              <p className="text-xs text-white/60">$2.99 once</p>
            </div>
            <a
              href={
                signedIn
                  ? '#report-unlock'
                  : `/register?next=${encodeURIComponent(returnPath)}`
              }
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold"
            >
              Unlock report →
            </a>
          </div>
        </>
      )}
    </div>
  )
}
