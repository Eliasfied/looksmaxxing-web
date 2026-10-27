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
import { ProPaywall } from '@/components/pro-paywall'
import type { ToolDefinition, ToolReport } from '@/lib/tool-report'

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
  const [claimed, setClaimed] = useState(Boolean(initialReport))
  const [planSaved, setPlanSaved] = useState(false),
    [savingPlan, setSavingPlan] = useState(false)
  const active = useRef(true)
  const returnPath = `/tools/result/${id}?checkout=1`
  const hasTasks = Boolean(report?.sections.some((s) => s.tasks?.length))
  const unlock = useCallback(async () => {
    setWaiting(true)
    setError('')
    try {
      const response = await fetch(`/api/tools/reports/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' })
      })
      if (!active.current) return
      if (response.status === 402) {
        setError('This report is part of Aura Pro.')
        return
      }
      if (!response.ok) throw new Error('Please sign in again to open this report.')
      const full = await fetch(`/api/tools/reports/${id}`, { cache: 'no-store' })
      const data = await full.json()
      if (!full.ok || !data.unlocked || !data.report)
        throw new Error('Your report is not ready yet. Please refresh this page.')
      setReport(data.report)
      posthog.capture('tool_report_unlocked', { tool: tool.slug })
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      if (active.current) setWaiting(false)
    }
  }, [id, tool.slug])
  async function makePlan() {
    setSavingPlan(true)
    setError('')
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id })
      })
      if (!response.ok) throw new Error((await response.json()).error ?? 'Could not save your plan.')
      setPlanSaved(true)
      posthog.capture('plan_created', { tool: tool.slug })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your plan.')
    } finally {
      setSavingPlan(false)
    }
  }
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
            // Coming back from checkout: open the report for the new Pro member.
            if (checkoutRequested) void unlock()
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
                            className="mt-1 accent-fuchsia-500"
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
          {hasTasks && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-fuchsia-400/25 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 p-5 print:hidden">
              <div>
                <p className="font-bold">Turn this into your daily plan</p>
                <p className="text-sm text-white/60">
                  Your tasks move to “My plan”, sync across devices and your coach follows along.
                </p>
              </div>
              {planSaved ? (
                <Link href="/plan" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">
                  Open my plan →
                </Link>
              ) : (
                <button
                  onClick={() => void makePlan()}
                  disabled={savingPlan}
                  className="btn-gradient rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingPlan ? 'Saving…' : 'Make this my plan'}
                </button>
              )}
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-5 print:hidden">
            <Link href="/tools" className="font-semibold text-fuchsia-300">
              Run another analysis →
            </Link>
            <Link href="/studio" className="text-white/70">
              Try a look in the studio
            </Link>
            <Link href="/dashboard" className="text-white/70">
              My glow-up
            </Link>
            <button onClick={() => window.print()} className="text-white/70">
              Print / save PDF
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          )}
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
                  Pro
                </span>
              </section>
            ))}
          </div>
          <div id="report-unlock" className="mt-7 scroll-mt-6">
            {signedIn && !claimed ? (
              <p className="text-sm text-white/60">Saving your report to your account…</p>
            ) : (
              <ProPaywall
                signedIn={signedIn}
                returnTo={returnPath}
                placement={`tool-result:${tool.slug}`}
                headline="Your full report is one step away"
                subline="Aura Pro unlocks this report and every other analysis, try-on and plan."
                onActivated={() => unlock()}
              />
            )}
            {signedIn && claimed && (
              <button
                onClick={() => void unlock()}
                disabled={waiting}
                className="mt-4 text-sm text-white/55 underline"
              >
                {waiting ? 'Checking your access…' : 'Already Pro, or have credits from an earlier purchase? Open the report'}
              </button>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
