'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Lock } from 'lucide-react'
import posthog from 'posthog-js'
import { dayOneTasks, lockedDays, type Audience } from '@/lib/glow-day-one'
import { cn } from '@/lib/utils'
import type { FaceGeometry } from '../../../config/face-geometry'

/**
 * Free day 1 of the plan, right under the on-device preview. Three tasks the
 * visitor can do today, the plan's later days shown locked, and the buy block.
 */
export function GlowDayOne({
  geometry,
  tool,
  defaultAudience,
  children
}: {
  geometry: FaceGeometry
  tool: string
  defaultAudience: Audience
  /** The buy block, shown under the locked days. */
  children: ReactNode
}) {
  const [audience, setAudience] = useState<Audience>(defaultAudience)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const ref = useRef<HTMLElement>(null)
  const tasks = dayOneTasks(
    { shape: geometry.faceShape.shape, tilt: geometry.canthalTilt.label, spacing: geometry.eyes.spacingLabel },
    audience
  )
  const count = tasks.filter((t) => done[t.id]).length

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        posthog.capture('glow_day1_viewed', { tool })
        io.disconnect()
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [tool])

  function toggle(id: string) {
    const next = !done[id]
    setDone((d) => ({ ...d, [id]: next }))
    if (next) posthog.capture('glow_day1_task_done', { tool, task: id, audience })
  }

  return (
    <section
      ref={ref}
      aria-label="Your day 1"
      className="relative overflow-hidden rounded-[2rem] border border-fuchsia-400/30 bg-gradient-to-b from-fuchsia-600/[0.12] via-[#120d1c] to-[#0d0b14] p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200">Your day 1 · free</p>
          <h2 className="mt-2 text-2xl font-black leading-tight">
            Start today, built from your {geometry.faceShape.shape.toLowerCase()} face
          </h2>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1" role="radiogroup" aria-label="Plan for">
          {(['men', 'women'] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={audience === a}
              onClick={() => setAudience(a)}
              className={cn('rounded-full px-3 py-1 text-xs font-bold transition', audience === a ? 'bg-white text-black' : 'text-white/60')}
            >
              {a === 'men' ? 'Him' : 'Her'}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => toggle(t.id)}
              aria-pressed={Boolean(done[t.id])}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition',
                done[t.id] ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : 'border-white/10 bg-black/20 hover:border-white/25'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                  done[t.id] ? 'border-fuchsia-400 bg-fuchsia-500' : 'border-white/30'
                )}
              >
                {done[t.id] && <Check className="h-3.5 w-3.5" aria-hidden />}
              </span>
              <span>
                <span className={cn('block font-bold', done[t.id] && 'text-white/55 line-through')}>{t.title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-white/60">{t.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {count === tasks.length && (
        <p className="mt-3 text-center text-sm font-bold text-fuchsia-200">Day 1 done. 29 days to go.</p>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-sm font-bold">Days 2 to 30, in your plan</p>
        <ul className="mt-3 space-y-2">
          {lockedDays(audience).map(([day, task]) => (
            <li key={day} className="flex items-center gap-3 text-sm text-white/55">
              <Lock className="h-3.5 w-3.5 shrink-0 text-fuchsia-300/80" aria-hidden />
              <span className="w-14 shrink-0 font-semibold text-white/70">{day}</span>
              <span>{task}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}
