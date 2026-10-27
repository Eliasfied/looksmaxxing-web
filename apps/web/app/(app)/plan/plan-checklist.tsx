'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { StoredPlan } from '@/lib/routines'
import { cn } from '@/lib/utils'

export function PlanChecklist({ plan }: { plan: StoredPlan }) {
  const [done, setDone] = useState<Record<string, boolean>>(plan.done ?? {})
  const [error, setError] = useState('')
  const keys = plan.sections.flatMap((s, i) => s.tasks.map((_, j) => `${i}-${j}`))
  const count = keys.filter((k) => done[k]).length
  const pct = keys.length ? Math.round((count / keys.length) * 100) : 0

  async function toggle(key: string) {
    const value = !done[key]
    setDone((d) => ({ ...d, [key]: value }))
    setError('')
    const res = await fetch('/api/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, done: value })
    }).catch(() => null)
    if (!res?.ok) {
      setDone((d) => ({ ...d, [key]: !value }))
      setError('Could not save that change. Check your connection.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-4xl font-black">{pct}%</p>
          <p className="text-sm text-white/55">
            {count} of {keys.length} done
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {plan.sections.map((section, i) => (
        <section key={i} className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-black">{section.title}</h2>
          <ul className="mt-4 space-y-2">
            {section.tasks.map((task, j) => {
              const key = `${i}-${j}`
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => void toggle(key)}
                    aria-pressed={Boolean(done[key])}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition',
                      done[key] ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-white/50 line-through' : 'border-white/10 hover:border-white/25'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        done[key] ? 'border-fuchsia-400 bg-fuchsia-500' : 'border-white/30'
                      )}
                    >
                      {done[key] && <Check className="h-3.5 w-3.5 text-white" aria-hidden />}
                    </span>
                    <span>{task}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
