'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { ArrowLeft, Camera, Check, ScanFace, Sparkles } from 'lucide-react'
import { preparePhoto } from '@/lib/prepare-photo'
import { AREA_LABELS, AREAS, type Area, type GlowIntake } from '@/lib/glow-plan'
import { cn } from '@/lib/utils'

type Draft = Partial<GlowIntake> & { goals: Area[]; skinConcerns: string[]; hairConcerns: string[] }

type Choice = [value: string, label: string, hint?: string]

const Q = {
  audience: [['men', 'For him'], ['women', 'For her']],
  age: [['under-18', 'Under 18'], ['18-24', '18–24'], ['25-34', '25–34'], ['35-44', '35–44'], ['45-plus', '45+']],
  skinType: [['oily', 'Oily', 'Shiny by midday'], ['dry', 'Dry', 'Tight, flaky'], ['combination', 'Combination', 'Oily T-zone'], ['normal', 'Normal'], ['sensitive', 'Sensitive', 'Reacts, turns red'], ['unsure', 'Not sure']],
  skinConcerns: [['acne', 'Breakouts'], ['dark-circles', 'Dark circles'], ['texture', 'Texture & pores'], ['redness', 'Redness'], ['dullness', 'Dull, tired'], ['oiliness', 'Oiliness']],
  hairType: [['straight', 'Straight'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['coily', 'Coily']],
  hairConcerns: [['thinning', 'Thinning'], ['frizz', 'Frizz'], ['dandruff', 'Dandruff'], ['no-style', 'No real style'], ['damage', 'Damaged ends']],
  facialHair: [['none', 'None, clean shaven'], ['stubble', 'Stubble'], ['beard', 'Beard'], ['patchy', 'Patchy']],
  body: [['lean', 'Lean'], ['average', 'Average'], ['some-extra', 'A bit extra'], ['a-lot-extra', 'Quite a bit extra']],
  training: [['none', 'Nothing yet'], ['home', 'At home'], ['gym', 'Gym']],
  diet: [['everything', 'I eat everything'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan']],
  sleep: [['under-6', 'Under 6 h'], ['6-7', '6–7 h'], ['7-8', '7–8 h'], ['8-plus', '8 h +']],
  minutes: [['10', '10 min', 'The essentials'], ['20', '20 min', 'Recommended'], ['40', '40 min', 'All in']],
  budget: [['low', 'Low', 'Drugstore'], ['medium', 'Medium'], ['high', 'Higher', 'Happy to invest']]
} satisfies Record<string, Choice[]>

function Options({
  choices,
  value,
  onPick,
  multi = false,
  cols = 2
}: {
  choices: Choice[]
  value: string | string[] | undefined
  onPick: (v: string) => void
  multi?: boolean
  cols?: 2 | 3
}) {
  return (
    <div className={cn('grid gap-2.5', cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2')}>
      {choices.map(([v, label, hint]) => {
        const on = multi ? (value as string[] | undefined)?.includes(v) : value === v
        return (
          <button
            key={v}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={Boolean(on)}
            onClick={() => onPick(v)}
            className={cn(
              'flex items-start justify-between gap-2 rounded-2xl border px-4 py-3.5 text-left transition',
              on ? 'border-fuchsia-400/60 bg-fuchsia-500/15' : 'border-white/10 bg-white/[0.02] hover:border-white/25'
            )}
          >
            <span>
              <span className="block font-bold">{label}</span>
              {hint && <span className="block text-xs text-white/45">{hint}</span>}
            </span>
            {on && <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="mb-2.5 font-bold">{label}</p>
      {hint && <p className="-mt-1.5 mb-2.5 text-xs text-white/45">{hint}</p>}
      {children}
    </div>
  )
}

const STEPS = ['You', 'Goals', 'Skin', 'Hair', 'Body', 'Time', 'Scan'] as const
const GENERATING = [
  'Reading your scan…',
  'Matching routines to your skin type…',
  'Picking haircuts for your face shape…',
  'Planning 30 days of tasks…',
  'Checking it fits your time and budget…'
]

export function GlowIntake({ initial, recentScanId }: { initial?: GlowIntake | null; recentScanId?: string | null }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(() => ({ goals: [], skinConcerns: [], hairConcerns: [], note: '', ...(initial ?? {}) }) as Draft)
  const [phase, setPhase] = useState<'form' | 'scanning' | 'generating'>('form')
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [useRecent, setUseRecent] = useState(Boolean(initial && recentScanId))

  useEffect(() => {
    posthog.capture('glow_intake_started')
  }, [])
  useEffect(() => {
    if (phase !== 'generating') return
    const id = setInterval(() => setTick((t) => Math.min(t + 1, GENERATING.length - 1)), 6000)
    return () => clearInterval(id)
  }, [phase])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((x) => ({ ...x, [key]: value }))
  const toggle = (key: 'goals' | 'skinConcerns' | 'hairConcerns', v: string) =>
    setD((x) => {
      const cur = x[key] as string[]
      return { ...x, [key]: cur.includes(v) ? cur.filter((c) => c !== v) : [...cur, v] }
    })

  const ready = [
    Boolean(d.audience && d.age),
    d.goals.length > 0,
    Boolean(d.skinType),
    Boolean(d.hairType && (d.audience === 'women' || d.facialHair)),
    Boolean(d.body && d.training && d.diet && d.sleep),
    Boolean(d.minutes && d.budget),
    true
  ]

  async function generate(scanId: string) {
    setPhase('generating')
    setTick(0)
    const intake = { ...d, facialHair: d.audience === 'women' ? 'none' : d.facialHair }
    const res = await fetch('/api/glow-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake, scanId })
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) {
      setPhase('form')
      setError(data?.error ?? 'We could not build your plan. Please try again.')
      return
    }
    posthog.capture('glow_plan_created', { audience: d.audience, goals: d.goals.length })
    router.refresh()
  }

  async function scan(file: File | undefined) {
    if (!file) return
    setError('')
    setPhase('scanning')
    try {
      const imageBase64 = await preparePhoto(file)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Please try again.')
      if ((data.scan?.confidence ?? 1) < 0.4) throw new Error('We could not see a face clearly. Use a front-facing photo in good light.')
      posthog.capture('face_scan_completed', { placement: 'glow-intake' })
      await generate(data.scan.id)
    } catch (e) {
      setPhase('form')
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    }
  }

  if (phase !== 'form') {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-fuchsia-500/20" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600">
            {phase === 'scanning' ? <ScanFace className="h-10 w-10" aria-hidden /> : <Sparkles className="h-10 w-10" aria-hidden />}
          </span>
        </div>
        <h1 className="mt-8 text-3xl font-black">{phase === 'scanning' ? 'Scanning your face…' : 'Building your plan…'}</h1>
        <p className="mt-3 text-white/60" aria-live="polite">
          {phase === 'scanning' ? 'PSL score, 9 sub-scores, face shape and skin. About 20 seconds.' : GENERATING[tick]}
        </p>
        <p className="mt-8 text-xs text-white/40">This takes up to a minute. Please keep this page open.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Your big start scan</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">{initial ? 'Rebuild your plan' : 'Let’s build your 30-day plan'}</h1>
      <p className="mt-2 text-white/60">About 2 minutes of questions, then one selfie. Your answers decide what the plan contains.</p>

      <ol className="mt-8 flex gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <span className={cn('block h-1.5 rounded-full transition', i <= step ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500' : 'bg-white/10')} />
            <span className={cn('mt-1.5 hidden text-[11px] sm:block', i === step ? 'text-white' : 'text-white/35')}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-7 rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        {step === 0 && (
          <>
            <Field label="Who is this plan for?">
              <Options choices={Q.audience} value={d.audience} onPick={(v) => set('audience', v as GlowIntake['audience'])} />
            </Field>
            <Field label="How old are you?">
              <Options choices={Q.age} value={d.age} onPick={(v) => set('age', v as GlowIntake['age'])} cols={3} />
            </Field>
          </>
        )}
        {step === 1 && (
          <Field label="What do you want to work on?" hint="Pick everything that matters to you. The plan focuses on these.">
            <Options
              multi
              choices={AREAS.map((a) => [a, AREA_LABELS[a]] as Choice)}
              value={d.goals}
              onPick={(v) => toggle('goals', v)}
            />
          </Field>
        )}
        {step === 2 && (
          <>
            <Field label="Your skin type">
              <Options choices={Q.skinType} value={d.skinType} onPick={(v) => set('skinType', v as GlowIntake['skinType'])} cols={3} />
            </Field>
            <Field label="Anything that bothers you?" hint="Optional, pick any.">
              <Options multi choices={Q.skinConcerns} value={d.skinConcerns} onPick={(v) => toggle('skinConcerns', v)} cols={3} />
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <Field label="Your hair type">
              <Options choices={Q.hairType} value={d.hairType} onPick={(v) => set('hairType', v as GlowIntake['hairType'])} />
            </Field>
            <Field label="Hair concerns" hint="Optional.">
              <Options multi choices={Q.hairConcerns} value={d.hairConcerns} onPick={(v) => toggle('hairConcerns', v)} cols={3} />
            </Field>
            {d.audience !== 'women' && (
              <Field label="Facial hair right now">
                <Options choices={Q.facialHair} value={d.facialHair} onPick={(v) => set('facialHair', v as GlowIntake['facialHair'])} />
              </Field>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <Field label="Your body right now" hint="Honest guess. It only sets how much the plan does on nutrition.">
              <Options choices={Q.body} value={d.body} onPick={(v) => set('body', v as GlowIntake['body'])} />
            </Field>
            <Field label="Where can you train?">
              <Options choices={Q.training} value={d.training} onPick={(v) => set('training', v as GlowIntake['training'])} cols={3} />
            </Field>
            <Field label="Diet">
              <Options choices={Q.diet} value={d.diet} onPick={(v) => set('diet', v as GlowIntake['diet'])} cols={3} />
            </Field>
            <Field label="Sleep on a normal night">
              <Options choices={Q.sleep} value={d.sleep} onPick={(v) => set('sleep', v as GlowIntake['sleep'])} />
            </Field>
          </>
        )}
        {step === 5 && (
          <>
            <Field label="Time per day">
              <Options choices={Q.minutes} value={d.minutes} onPick={(v) => set('minutes', v as GlowIntake['minutes'])} cols={3} />
            </Field>
            <Field label="Budget for products">
              <Options choices={Q.budget} value={d.budget} onPick={(v) => set('budget', v as GlowIntake['budget'])} cols={3} />
            </Field>
            <Field label="Anything else? (optional)">
              <textarea
                value={d.note ?? ''}
                maxLength={300}
                onChange={(e) => set('note', e.target.value)}
                placeholder="E.g. wedding in 5 weeks, I wear glasses, I work night shifts…"
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm outline-none focus:border-fuchsia-400/60"
              />
            </Field>
          </>
        )}
        {step === 6 && (
          <div className="text-center">
            <ScanFace className="mx-auto h-10 w-10 text-fuchsia-300" aria-hidden />
            <h2 className="mt-4 text-2xl font-black">Last step: your face scan</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Front-facing, good daylight, no filter, hair off the forehead if you can. This is your day-1 photo; you will compare against it on day 30.
            </p>
            {recentScanId && (
              <label className="mx-auto mt-5 flex max-w-sm cursor-pointer items-center justify-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={useRecent} onChange={(e) => setUseRecent(e.target.checked)} className="accent-fuchsia-500" />
                Use my scan from the last 7 days
              </label>
            )}
            {useRecent && recentScanId ? (
              <button type="button" onClick={() => void generate(recentScanId)} className="btn-gradient mt-6 inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-bold text-white">
                <Sparkles className="h-5 w-5" aria-hidden /> Build my plan
              </button>
            ) : (
              <label className="btn-gradient mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl px-8 py-4 text-lg font-bold text-white">
                <Camera className="h-5 w-5" aria-hidden /> Upload my selfie
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void scan(e.target.files?.[0])} />
              </label>
            )}
            <p className="mt-4 text-xs text-white/40">Your photo is used for the scan only. We never sell or share photos.</p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={cn('inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white', step === 0 && 'invisible')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            disabled={!ready[step]}
            onClick={() => {
              setStep((s) => s + 1)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="btn-gradient rounded-2xl px-8 py-3.5 font-bold text-white transition disabled:opacity-40"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}
