'use client'

/* eslint-disable @next/next/no-img-element -- static illustration images */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Camera,
  Check,
  ChevronDown,
  Dumbbell,
  ListChecks,
  Salad,
  ScanFace,
  Scissors,
  Shirt,
  Sparkles,
  Smile,
  Droplets,
  X
} from 'lucide-react'
import posthog from 'posthog-js'
import { GlowOffer, GlowPrice } from '@/components/glow-offer'
import { Reveal } from '@/components/pro-sales'
import { GLOW } from '@/lib/glow-offer'
import { cn } from '@/lib/utils'

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">{children}</p>
}

const AREAS = [
  [Droplets, 'Skin', 'AM/PM routine for your skin type, SPF habit, what to do about breakouts or dark circles.'],
  [Scissors, 'Hair', 'A cut that suits your face shape, a barber or salon brief, styling and care.'],
  [Smile, 'Face & jawline', 'What actually sharpens a jawline in 30 days: body fat, posture, beard or hair framing.'],
  [Salad, 'Nutrition', 'Protein and water targets, simple meals for your diet, no crash diets.'],
  [Dumbbell, 'Training', 'Short workouts for gym, home or none, matched to your schedule.'],
  [Shirt, 'Style & grooming', 'Brows, nails, fragrance, fit and colors. The quick wins people notice first.']
] as const

const DEMO = {
  men: [
    ['Morning routine', 'Gentle cleanser · niacinamide · SPF 50'],
    ['Book the barber', 'Ask for a mid fade with textured top, scissor-cut on the sides'],
    ['120 g protein', 'Eggs at breakfast, chicken or tofu at lunch and dinner'],
    ['Workout A · 35 min', 'Squats 3×10, push-ups 3×12, rows 3×10, plank 3×40 s'],
    ['Tongue & neck posture', 'Three 1-minute check-ins, phone at eye level'],
    ['Evening routine', 'Cleanser · retinal 2×/week · moisturizer']
  ],
  women: [
    ['Morning routine', 'Gentle cleanser · vitamin C · SPF 50'],
    ['Salon brief', 'Face-framing layers starting at the cheekbone'],
    ['Brows', 'Brush up, trim the longest hairs, fill only the gaps'],
    ['8,000 steps', 'A 20-minute walk after lunch covers half'],
    ['Silk pillowcase & low tension', 'Loose braid or scrunchie for the night'],
    ['Evening routine', 'Double cleanse · moisturizer · eye cream']
  ]
} as const

const FAQ: [string, string][] = [
  ['Is this a subscription?', `No. You pay ${'$' + GLOW.price.toFixed(2)} once. There is no renewal and nothing to cancel.`],
  ['How much time does it take?', 'You choose 10, 20 or 40 minutes a day in the questionnaire, and the plan is built around that.'],
  ['What do I get after the payment?', `The big start scan, your personal plan, ${GLOW.accessDays} days of every Aura Pro feature (try-ons, coach, AI reports) and a PDF. The plan and the PDF stay yours afterwards.`],
  ['Is it for women too?', 'Yes. The questionnaire asks who the plan is for, and the routines, hairstyles and tasks change with it.'],
  ['Will my PSL score go up by 2 points?', 'Probably not, and nobody honest can promise that. In 30 days the biggest changes are skin, hair, grooming, posture and how rested you look. Those are exactly the things people notice first.'],
  ['What about surgery, fillers or pills?', 'Not part of the plan. If something needs medical help, the plan tells you to see a dermatologist or doctor.'],
  ['What happens with my photo?', 'It is used for your scan and your try-ons. We never sell or share photos.']
]

function Phone() {
  const [ticked, setTicked] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTicked((t) => (t + 1) % 6), 1100)
    return () => clearInterval(id)
  }, [])
  const tasks = ['Morning routine', 'Book the barber', '120 g protein', 'Workout A', '8,000 steps', 'Evening routine']
  return (
    <div className="animate-float mx-auto w-full max-w-[19rem] rounded-[2.5rem] border border-white/15 bg-[#0c0a12] p-3 shadow-[0_40px_120px_-30px_rgba(192,38,211,0.6)]">
      <div className="rounded-[2rem] bg-gradient-to-b from-[#1a1424] to-[#0d0b14] p-5">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="font-bold text-white">Aura</span>
          <span>Day 12 of 30</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[40%] rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" />
        </div>
        <p className="mt-5 text-lg font-black">Today</p>
        <ul className="mt-3 space-y-2">
          {tasks.map((t, i) => {
            const done = i <= ticked
            return (
              <li
                key={t}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-500',
                  done ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-white/50 line-through' : 'border-white/10 text-white'
                )}
              >
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border transition', done ? 'border-fuchsia-400 bg-fuchsia-500' : 'border-white/30')}>
                  {done && <Check className="h-3 w-3" aria-hidden />}
                </span>
                {t}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function BeforeAfter({ audience }: { audience: 'men' | 'women' }) {
  const [pos, setPos] = useState(50)
  const base = `/images/glow-up/${audience}`
  return (
    <figure>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/10 bg-black">
        <img src={`${base}-after.webp`} alt="Illustration: the same model after 30 days of routine" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={`${base}-before.webp`} alt="Illustration: the model on day 1" className="h-full w-full object-cover" />
        </div>
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
          <div className="h-full w-0.5 -translate-x-1/2 bg-white/80" />
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold backdrop-blur">Day 1</span>
        <span className="absolute right-3 top-3 rounded-full bg-fuchsia-600/80 px-2.5 py-1 text-xs font-bold backdrop-blur">Day 30</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Compare day 1 and day 30"
          className="absolute inset-x-4 bottom-4 accent-fuchsia-500"
        />
      </div>
      <figcaption className="mt-3 text-xs leading-relaxed text-white/45">
        Illustration with an AI-generated model, not a customer result. It shows the kind of change 30 days can bring:
        skin, grooming, hair and rest. Your face structure stays yours.
      </figcaption>
    </figure>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold">
        {q}
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <p className="px-5 pb-5 text-sm leading-relaxed text-white/60">{a}</p>}
    </div>
  )
}

export function GlowSales({
  signedIn,
  placement,
  returnTo = '/glow-up',
  intro,
  onActivated,
  beforeCheckout,
  autoCheckout = false,
  embedded = false
}: {
  signedIn: boolean
  placement: string
  returnTo?: string
  /** Optional line that ties the page to where the visitor came from. */
  intro?: string
  onActivated?: () => void | Promise<void>
  /** Called right before sign-up or checkout, e.g. to keep a chosen photo. */
  beforeCheckout?: () => void
  /** The visitor clicked buy, signed up and came back: open the checkout at once. */
  autoCheckout?: boolean
  /** Inside another page: the hero title becomes an h2. */
  embedded?: boolean
}) {
  const Title = embedded ? 'h2' : 'h1'
  const [audience, setAudience] = useState<'men' | 'women'>('men')
  const [demoDone, setDemoDone] = useState<Record<number, boolean>>({})
  const [sticky, setSticky] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const offerRef = useRef<HTMLDivElement>(null)
  const offerId = 'glow-offer'

  useEffect(() => {
    posthog.capture('glow_sales_viewed', { placement })
    let heroOut = false,
      offerIn = false
    const update = () => setSticky(heroOut && !offerIn)
    const a = new IntersectionObserver(([e]) => {
      heroOut = !e.isIntersecting && e.boundingClientRect.top < 0
      update()
    })
    const b = new IntersectionObserver(([e]) => {
      offerIn = e.isIntersecting || e.boundingClientRect.top < 0
      update()
    })
    if (heroRef.current) a.observe(heroRef.current)
    if (offerRef.current) b.observe(offerRef.current)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [placement])

  // Back from sign-up: show the offer the checkout opens over.
  useEffect(() => {
    if (autoCheckout) document.getElementById(offerId)?.scrollIntoView({ block: 'start' })
  }, [autoCheckout])

  const toOffer = () => {
    posthog.capture('glow_sales_cta', { placement })
    document.getElementById(offerId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const demoCount = DEMO[audience].filter((_, i) => demoDone[i]).length

  return (
    <div className="relative space-y-24 sm:space-y-32" onClickCapture={beforeCheckout}>
      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0c0a12] px-6 py-12 sm:px-12 sm:py-16">
        <div aria-hidden className="animate-glow pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-600/35 via-violet-600/30 to-sky-500/20 blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Eyebrow>The 30-Day Glow-Up Plan</Eyebrow>
            {intro && <p className="mt-3 text-sm font-semibold text-white/70">{intro}</p>}
            <Title className="mt-5 text-4xl font-black leading-[1.05] sm:text-6xl">
              30 days.<br />One plan.<br />
              <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Built from your face.</span>
            </Title>
            <p className="mt-6 max-w-xl text-lg text-white/65">
              A big scan of your face, a few questions about your skin, hair, body and time, and Aura turns it into one clear daily checklist.
              Skin, hair, jawline, nutrition, training and style, in about 20 minutes a day.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <button type="button" onClick={toOffer} className="btn-gradient rounded-2xl px-8 py-4 text-lg font-bold text-white shadow-lg shadow-fuchsia-900/40">
                Get my plan
              </button>
              <GlowPrice size="sm" />
            </div>
            <p className="mt-4 text-sm text-white/45">One payment · no subscription · for men and women</p>
          </div>
          <Phone />
        </div>
      </section>

      {/* Problem */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">You have seen 200 tips. None of them were about you.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ['Random advice', 'One video says mewing, the next says retinol, the third sells a jawline gadget. Nothing adds up to a plan.'],
            ['Not your face', 'Advice for oily skin does not help dry skin. A cut for a round face looks off on a long one. Generic tips miss you.'],
            ['Monday to Thursday', 'You start strong, then life happens. Without a daily list you forget what you meant to do and quit.']
          ].map(([title, text], i) => (
            <Reveal key={title} delay={i * 120}>
              <div className="h-full rounded-[1.75rem] border border-red-400/15 bg-gradient-to-b from-red-500/[0.07] to-transparent p-7">
                <X className="h-6 w-6 text-red-300" aria-hidden />
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The solution</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">One plan that knows your face, your time and your budget.</h2>
        </Reveal>
        <ol className="relative mt-14 grid gap-5 md:grid-cols-4">
          {[
            [ScanFace, 'Big start scan', 'One selfie and 2 minutes of questions about your skin, hair, body, diet, time and budget.'],
            [Sparkles, 'Your plan', 'Aura writes 30 days of tasks for the areas you care about, plus your morning and evening routine.'],
            [ListChecks, 'Tick it off daily', 'Open the app, see today, tick it off. Progress photos on days 7, 14 and 21.'],
            [Camera, 'Day-30 re-scan', 'Scan again and compare day 1 with day 30, side by side.']
          ].map(([Icon, title, text], i) => {
            const I = Icon as typeof ScanFace
            return (
              <Reveal key={title as string} delay={i * 120}>
                <li className="h-full list-none rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/40 to-violet-500/40">
                    <I className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-4 text-xs font-bold text-fuchsia-300">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-black">{title as string}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{text as string}</p>
                </li>
              </Reveal>
            )
          })}
        </ol>
      </section>

      {/* Inside */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>What is inside</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">Six areas. One checklist.</h2>
          <p className="mt-4 text-white/55">You pick what matters to you. The plan only covers what you chose.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="h-full rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 transition hover:border-fuchsia-400/40">
                <Icon className="h-6 w-6 text-fuchsia-300" aria-hidden />
                <h3 className="mt-3 text-lg font-black">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* A day in the plan */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <Eyebrow>Simple to follow</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">This is what a day looks like.</h2>
          <p className="mt-4 text-white/60">
            No 40-page PDF you never open. Every morning you see today’s list: your routine, one or two new tasks, your habits. Tap to tick off.
          </p>
          <div className="mt-6 inline-flex rounded-full border border-white/10 bg-black/40 p-1" role="radiogroup" aria-label="Example plan for">
            {(['men', 'women'] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={audience === a}
                onClick={() => {
                  setAudience(a)
                  setDemoDone({})
                }}
                className={cn('rounded-full px-5 py-2 text-sm font-bold transition', audience === a ? 'bg-white text-black' : 'text-white/60')}
              >
                {a === 'men' ? 'For him' : 'For her'}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="rounded-[1.75rem] border border-white/10 bg-[#0d0b14] p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-black">Day 4 · Example</p>
              <p className="text-sm text-white/50">{demoCount} / {DEMO[audience].length}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all" style={{ width: `${(demoCount / DEMO[audience].length) * 100}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {DEMO[audience].map(([t, d], i) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => setDemoDone((x) => ({ ...x, [i]: !x[i] }))}
                    aria-pressed={Boolean(demoDone[i])}
                    className={cn('flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition', demoDone[i] ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : 'border-white/10 hover:border-white/25')}
                  >
                    <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', demoDone[i] ? 'border-fuchsia-400 bg-fuchsia-500' : 'border-white/30')}>
                      {demoDone[i] && <Check className="h-3.5 w-3.5" aria-hidden />}
                    </span>
                    <span>
                      <span className={cn('block font-semibold', demoDone[i] && 'text-white/50 line-through')}>{t}</span>
                      <span className="block text-xs text-white/45">{d}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {demoCount === DEMO[audience].length && <p className="mt-4 text-center text-sm font-bold text-fuchsia-200">Day done. That is all it takes.</p>}
          </div>
        </Reveal>
      </section>

      {/* Outcome */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal className="mx-auto w-full max-w-sm lg:order-2">
          <BeforeAfter audience={audience} />
        </Reveal>
        <Reveal delay={120}>
          <Eyebrow>Honest outcome</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">What 30 days can change.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
              <p className="font-black text-emerald-200">Likely</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {['Calmer, more even skin', 'A haircut that fits your face', 'Groomed brows and beard', 'Less puffy, more rested look', 'Better posture in photos', 'A routine you actually keep'].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="font-black text-white/70">Not in 30 days</p>
              <ul className="mt-3 space-y-2 text-sm text-white/50">
                {['Bone structure or jaw width', 'Eye shape or canthal tilt', 'Height', 'Big fat loss (1–2 kg is realistic)', 'Medical skin conditions'].map((t) => (
                  <li key={t} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-white/40" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Offer */}
      <section ref={offerRef}>
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <Eyebrow>Your plan</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">Everything for 30 days. Paid once.</h2>
        </Reveal>
        <Reveal delay={100} className="mx-auto max-w-3xl">
          <GlowOffer
            id={offerId}
            signedIn={signedIn}
            placement={placement}
            returnTo={returnTo}
            onActivated={onActivated}
            autoCheckout={autoCheckout}
          />
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-4xl">Before you start</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0a12]/90 px-4 py-3 backdrop-blur-xl transition-transform duration-300 print:hidden',
          sticky ? 'translate-y-0' : 'translate-y-full'
        )}
        aria-hidden={!sticky}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-sm">
            <span className="font-black">30-Day Glow-Up Plan</span>
            <span className="text-white/55"> · ${GLOW.price.toFixed(2)} once</span>
          </p>
          <button type="button" tabIndex={sticky ? 0 : -1} onClick={toOffer} className="btn-gradient shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            Get my plan
          </button>
        </div>
      </div>
    </div>
  )
}
