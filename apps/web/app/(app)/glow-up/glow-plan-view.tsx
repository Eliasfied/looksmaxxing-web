'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import {
  Camera,
  Check,
  Dumbbell,
  Download,
  Droplets,
  Flag,
  Moon,
  RefreshCw,
  Salad,
  Scissors,
  Shirt,
  Smile,
  Sparkles,
  Sun,
  Wand2
} from 'lucide-react'
import {
  AREA_LABELS,
  PLAN_DAYS,
  checklistForDay,
  dayProgress,
  planDay,
  type Area,
  type ChecklistItem,
  type GlowPlanContent
} from '@/lib/glow-plan'
import { TRYON_CATALOG } from '@/lib/tryon-catalog'
import { cn } from '@/lib/utils'

const AREA_ICON: Record<Area, typeof Droplets> = {
  skin: Droplets,
  hair: Scissors,
  face: Smile,
  nutrition: Salad,
  training: Dumbbell,
  style: Shirt
}

function itemIcon(item: ChecklistItem) {
  if (item.area === 'milestone') return Flag
  if (item.area === 'routine') return item.key.endsWith('-am') ? Sun : Moon
  return AREA_ICON[item.area]
}

const noop = () => () => {}

const lookLabel = (type: string, id: string) =>
  TRYON_CATALOG.find((c) => c.type === type)?.options.find((o) => o.id === id)?.label ?? id

export interface ScanBrief {
  id: string
  createdAt: string
  overallPslScore: number
  skinClarityScore: number
}

export function GlowPlanView({
  plan,
  initialDone,
  startedAt,
  accessUntil,
  active,
  baseline,
  latest,
  canRebuild
}: {
  plan: GlowPlanContent
  initialDone: Record<string, boolean>
  startedAt: string
  accessUntil: string | null
  active: boolean
  baseline: ScanBrief | null
  latest: ScanBrief | null
  canRebuild: boolean
}) {
  const [done, setDone] = useState(initialDone)
  const [error, setError] = useState('')
  // The current day depends on the viewer's calendar, so it is set on the client.
  const today = useSyncExternalStore(
    noop,
    () => planDay(startedAt),
    () => null
  )
  const [picked, setDay] = useState<number | null>(null)
  const day = picked ?? today ?? 1
  const strip = useRef<HTMLDivElement>(null)
  // Bring today into view in the day strip once the client knows the date.
  useEffect(() => {
    if (!today) return
    const el = strip.current?.children[today - 1] as HTMLElement | undefined
    if (el && strip.current) strip.current.scrollLeft = el.offsetLeft - strip.current.clientWidth / 2
  }, [today])

  const items = useMemo(() => checklistForDay(plan, day), [plan, day])
  const progress = dayProgress(plan, done, day)
  const totals = useMemo(() => {
    let count = 0,
      total = 0
    for (let d = 1; d <= PLAN_DAYS; d++) {
      const p = dayProgress(plan, done, d)
      count += p.count
      total += p.total
    }
    return { count, total }
  }, [plan, done])
  const streak = useMemo(() => {
    if (!today) return 0
    let s = 0
    for (let d = today; d >= 1; d--) {
      const p = dayProgress(plan, done, d)
      if (p.count / p.total >= 0.6) s++
      else if (d !== today) break
    }
    return s
  }, [plan, done, today])

  async function toggle(key: string) {
    const value = !done[key]
    setDone((x) => ({ ...x, [key]: value }))
    setError('')
    const res = await fetch('/api/glow-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, done: value })
    }).catch(() => null)
    if (!res?.ok) {
      setDone((x) => ({ ...x, [key]: !value }))
      setError('Could not save that. Check your connection.')
    } else if (value && dayProgress(plan, { ...done, [key]: true }, day).count === items.length) {
      posthog.capture('glow_day_completed', { day })
    }
  }

  const pct = progress.total ? Math.round((progress.count / progress.total) * 100) : 0
  const ring = 2 * Math.PI * 42
  const looks = [
    ...plan.looks.hair.map((id) => ({ type: 'hair', id })),
    ...(plan.looks.beard ? [{ type: 'beard', id: plan.looks.beard }] : []),
    ...(plan.looks.glasses ? [{ type: 'glasses', id: plan.looks.glasses }] : []),
    ...(plan.looks.color ? [{ type: 'color', id: plan.looks.color }] : [])
  ]
  const ended = !active

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0b14] p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
              30-Day Glow-Up Plan{today ? ` · Day ${today} of ${PLAN_DAYS}` : ''}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{plan.headline}</h1>
            {plan.summary && <p className="mt-3 text-white/65">{plan.summary}</p>}
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                <b>{Math.round((totals.count / Math.max(1, totals.total)) * 100)}%</b> <span className="text-white/50">of the plan</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                <b>{streak}</b> <span className="text-white/50">day streak</span>
              </span>
              <a href="/plan-pdf" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5">
                <Download className="h-3.5 w-3.5" aria-hidden /> PDF
              </a>
              {canRebuild && active && (
                <Link href="/glow-up?rebuild=1" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-semibold text-white/70 hover:bg-white/5">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Rebuild
                </Link>
              )}
            </div>
          </div>
          <div className="relative h-28 w-28 shrink-0" aria-label={`Day ${day}: ${progress.count} of ${progress.total} done`}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" className="fill-none stroke-white/10" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="fill-none stroke-fuchsia-500 transition-all duration-500"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - pct / 100)}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">{pct}%</span>
              <span className="text-[11px] text-white/50">Day {day}</span>
            </span>
          </div>
        </div>
      </header>

      {ended && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            Your 30-day access ended{accessUntil ? ` on ${new Date(accessUntil).toLocaleDateString('en-US')}` : ''}. The plan and the PDF stay yours. Try-ons, coach and new scans need Aura Pro.
          </p>
          <Link href="/pricing#aura-pro" className="btn-gradient rounded-full px-5 py-2 text-sm font-bold text-white">
            Keep going with Pro
          </Link>
        </div>
      )}

      {/* Day strip */}
      <section aria-label="Plan days">
        <div ref={strip} className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
          {Array.from({ length: PLAN_DAYS }, (_, i) => i + 1).map((d) => {
            const p = dayProgress(plan, done, d)
            const full = p.count === p.total
            const some = p.count > 0
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-current={d === day ? 'date' : undefined}
                aria-label={`Day ${d}${full ? ', done' : ''}`}
                className={cn(
                  'flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl border text-xs font-bold transition',
                  d === day ? 'border-white bg-white text-black' : full ? 'border-fuchsia-400/50 bg-fuchsia-500/25' : some ? 'border-fuchsia-400/25 bg-fuchsia-500/10' : 'border-white/10 text-white/60',
                  today && d > today && d !== day && 'opacity-40'
                )}
              >
                <span className="text-[10px] font-medium opacity-60">Day</span>
                {d}
              </button>
            )
          })}
        </div>
      </section>

      {/* Checklist */}
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-black">
              {day === today ? 'Today' : `Day ${day}`}
              <span className="ml-2 text-base font-semibold text-white/50">{plan.days[day - 1]?.title}</span>
            </h2>
            <p className="text-sm text-white/50">
              {progress.count} / {progress.total}
            </p>
          </div>
          <ul className="mt-4 space-y-2.5">
            {items.map((item) => {
              const Icon = itemIcon(item)
              const on = Boolean(done[item.key])
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => void toggle(item.key)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition',
                      on ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : item.area === 'milestone' ? 'border-amber-300/30 bg-amber-400/[0.06] hover:border-amber-300/50' : 'border-white/10 hover:border-white/25'
                    )}
                  >
                    <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-fuchsia-400 bg-fuchsia-500' : 'border-white/30')}>
                      {on && <Check className="h-3.5 w-3.5 text-white" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" aria-hidden />
                        <span className={cn('font-semibold', on && 'text-white/50 line-through')}>{item.text}</span>
                      </span>
                      {item.detail && <span className="mt-1 block text-sm text-white/50">{item.detail}</span>}
                      {item.steps && (
                        <span className="mt-1 block text-sm text-white/50">{item.steps.map((s) => s.step).join(' · ')}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {day >= 28 && (
            <div className="mt-6 rounded-[1.5rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-600/20 to-violet-600/15 p-6">
              <Camera className="h-6 w-6 text-fuchsia-200" aria-hidden />
              <p className="mt-3 text-xl font-black">Your day-30 re-scan</p>
              {baseline && latest && latest.id !== baseline.id && Date.parse(latest.createdAt) > Date.parse(baseline.createdAt) ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                  {[['Day 1', baseline], ['Latest', latest]].map(([label, s]) => (
                    <div key={label as string} className="rounded-2xl bg-black/30 p-4">
                      <p className="text-xs text-white/50">{label as string}</p>
                      <p className="text-3xl font-black">{(s as ScanBrief).overallPslScore.toFixed(1)}</p>
                      <p className="text-xs text-white/50">skin {(s as ScanBrief).skinClarityScore}/100</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/65">Same spot, same light as day 1. Then compare both scans side by side.</p>
              )}
              <Link href="/progress" className="btn-gradient mt-4 inline-flex rounded-xl px-5 py-3 text-sm font-bold text-white">
                Open progress & re-scan
              </Link>
            </div>
          )}
        </div>

        {/* Routines */}
        <div className="space-y-4">
          {[
            ['Morning', Sun, plan.morning],
            ['Evening', Moon, plan.evening]
          ].map(([label, Icon, steps]) => {
            const I = Icon as typeof Sun
            return (
              <div key={label as string} className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
                <p className="flex items-center gap-2 font-black">
                  <I className="h-4 w-4 text-fuchsia-300" aria-hidden /> {label as string} routine
                </p>
                <ol className="mt-3 space-y-2.5">
                  {(steps as GlowPlanContent['morning']).map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">{i + 1}</span>
                      <span>
                        <span className="font-semibold">{s.step}</span>
                        {s.detail && <span className="block text-white/50">{s.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
          {plan.workouts.length > 0 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
              <p className="flex items-center gap-2 font-black">
                <Dumbbell className="h-4 w-4 text-fuchsia-300" aria-hidden /> Training · {plan.trainingDays}× a week
              </p>
              <ul className="mt-3 space-y-3 text-sm">
                {plan.workouts.map((w) => (
                  <li key={w.title}>
                    <span className="font-semibold">{w.title}</span>
                    <span className="block text-white/50">{w.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Focus */}
      {plan.focus.length > 0 && (
        <section>
          <h2 className="text-2xl font-black">Your focus areas</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.focus.map((f) => {
              const Icon = AREA_ICON[f.area]
              return (
                <div key={f.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                    <Icon className="h-3.5 w-3.5" aria-hidden /> {AREA_LABELS[f.area]}
                  </p>
                  <p className="mt-2 text-lg font-black">{f.title}</p>
                  <p className="mt-1.5 text-sm text-white/55">{f.finding}</p>
                  {f.goal && <p className="mt-3 text-sm"><span className="font-bold text-white/80">Day-30 goal:</span> <span className="text-white/65">{f.goal}</span></p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Looks */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-600/25 via-[#120d1c] to-violet-600/20 p-6">
          <Sparkles className="h-6 w-6 text-fuchsia-200" aria-hidden />
          <p className="mt-3 text-2xl font-black">Future Me</p>
          <p className="mt-2 text-sm text-white/65">
            A goal picture of you on day 30: calmer skin, groomed, rested. Same face, same structure. It is a motivation, not a prediction.
          </p>
          <Link href="/studio?type=future&option=day-30-fresh-cut" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-black">
            Create my Future Me
          </Link>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-6">
          <p className="flex items-center gap-2 font-black">
            <Wand2 className="h-4 w-4 text-fuchsia-300" aria-hidden /> Looks picked for your face
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {looks.length ? (
              looks.map((l) => (
                <Link
                  key={`${l.type}-${l.id}`}
                  href={`/studio?type=${l.type}&option=${l.id}`}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10"
                >
                  {lookLabel(l.type, l.id)} →
                </Link>
              ))
            ) : (
              <Link href="/studio" className="text-sm text-fuchsia-300">Open the try-on studio →</Link>
            )}
          </div>
          <p className="mt-4 text-xs text-white/45">Try them on your own photo before you book the barber or salon.</p>
        </div>
      </section>

      {/* Products */}
      {plan.products.length > 0 && (
        <section>
          <h2 className="text-2xl font-black">What to buy</h2>
          <p className="mt-1 text-sm text-white/50">Product types and what to look for, so you can pick any brand in your budget.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plan.products.map((p, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-bold">{p.type}</p>
                  {p.budget && <p className="shrink-0 text-xs text-white/45">{p.budget}</p>}
                </div>
                {p.lookFor && <p className="mt-1 text-sm text-white/65">Look for: {p.lookFor}</p>}
                {p.why && <p className="mt-1 text-xs text-white/45">{p.why}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expectations */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-xl font-black">What to expect</h2>
          <ol className="mt-4 space-y-4 border-l border-white/10 pl-5">
            {plan.expectations.map((e) => (
              <li key={e.when} className="relative">
                <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
                <p className="text-sm font-bold">{e.when}</p>
                <p className="text-sm text-white/60">{e.text}</p>
              </li>
            ))}
          </ol>
        </div>
        {plan.limits.length > 0 && (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-xl font-black">Honest limits</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              {plan.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-white/40">
        Questions about a task? <Link href="/chat" className="text-fuchsia-300">Ask your coach</Link> — it knows your plan.
      </p>
    </div>
  )
}
