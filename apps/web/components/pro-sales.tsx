'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowDown,
  Check,
  ChevronDown,
  Eye,
  LineChart,
  ListChecks,
  Lock,
  MessageCircle,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Wand2,
  X
} from 'lucide-react'
import posthog from 'posthog-js'
import { ProPaywall } from '@/components/pro-paywall'
import { PRO_PLANS, yearlySaving } from '@/lib/pro-features'
import { appConfig } from '@/lib/config'
import { cn } from '@/lib/utils'
import { scanPortrait } from '../../../config/pro-illustration'

// Long-form Aura Pro page: problem, solution, every feature with a live
// mockup, comparison, trust, price and FAQ. Mockups are illustrations, never
// real user photos or invented results.

function useShown<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown] as const
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, shown] = useShown<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-shown={shown ? '' : undefined}
      className={cn('reveal', className)}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">{children}</p>
}

/* ---------- Mockups (illustrations) ---------- */

function MockFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#16121f] to-[#0c0a12] p-5 shadow-[0_30px_80px_-30px_rgba(124,58,237,0.6)]',
        className
      )}
    >
      {children}
    </div>
  )
}

function ScanMock() {
  const rows: Array<[string, number]> = [
    ['Jaw definition', 72],
    ['Eye area', 64],
    ['Skin clarity', 58],
    ['Symmetry', 81]
  ]
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/45">Face scan</span>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Example</span>
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div>
          <p className="text-5xl font-black tabular-nums">5.8</p>
          <p className="text-xs text-white/45">PSL estimate</p>
        </div>
        <div className="pb-1">
          <p className="text-2xl font-black text-fuchsia-300 tabular-nums">6.9</p>
          <p className="text-xs text-white/45">with styling</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value], i) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-white/55">{label}</span>
              <span className="font-bold">{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-transform duration-1000"
                style={{ width: `${value}%`, transitionDelay: `${300 + i * 150}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-white/[0.04] p-3 text-xs leading-relaxed text-white/60">
        <span className="font-bold text-white">Biggest lever:</span> a textured cut with more height on top balances your
        face length.
      </p>
    </MockFrame>
  )
}

function Head({ hair }: { hair: 'long' | 'crop' }) {
  // Static, trusted SVG markup from the shared illustration module.
  return <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: scanPortrait(hair, `pp-${hair}`) }} />
}

function TryOnMock() {
  return (
    <MockFrame className="p-0">
      <div className="relative aspect-[5/6]">
        <Head hair="long" />
        <div className="animate-tryon absolute inset-0">
          <Head hair="crop" />
        </div>
        <div className="animate-tryon-handle pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
        <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur">Before</span>
        <span className="absolute right-4 top-4 rounded-full bg-fuchsia-600/90 px-3 py-1 text-xs font-bold">Textured Crop</span>
      </div>
      <div className="flex gap-2 overflow-hidden border-t border-white/10 p-4">
        {['Haircut', 'Hair color', 'Beard', 'Glasses', 'Bald'].map((t, i) => (
          <span key={t} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold', i === 0 ? 'bg-white text-black' : 'border border-white/10 text-white/60')}>
            {t}
          </span>
        ))}
      </div>
    </MockFrame>
  )
}

function PlanMock() {
  const tasks = ['Book the textured crop', 'SPF every morning', 'Shape brows (tweeze strays only)', 'Sleep 7.5h, 5 nights']
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/45">Week 1</span>
        <span className="text-xs font-bold text-fuchsia-300">3 / 4 done</span>
      </div>
      <ul className="mt-4 space-y-2">
        {tasks.map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/25">
              {i < 3 && (
                <span className="tick flex h-5 w-5 items-center justify-center rounded-md bg-fuchsia-500" style={{ '--tick-delay': `${400 + i * 350}ms` } as CSSProperties}>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}
            </span>
            <span className={i < 3 ? 'text-white/50 line-through' : ''}>{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2 text-sm">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-violet-600/80 px-3 py-2">Should I grow a beard?</p>
        <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3 py-2 text-white/80">
          Your lower third is a bit longer than your middle third, so short stubble would balance it. Try it in the studio first.
        </p>
      </div>
    </MockFrame>
  )
}

function ProgressMock() {
  return (
    <MockFrame>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/45">Monthly check-ins</span>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Example</span>
      </div>
      <svg viewBox="0 0 320 140" className="mt-4 w-full" aria-hidden>
        <defs>
          <linearGradient id="pm-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {[30, 65, 100].map((y) => (
          <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path className="draw-line" d="M10 112 L85 100 L160 84 L235 70 L310 48" fill="none" stroke="url(#pm-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {[
          [10, 112],
          [85, 100],
          [160, 84],
          [235, 70],
          [310, 48]
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="5" fill="#0c0a12" stroke="#e879f9" strokeWidth="2.5" />
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ['Skin', '+9'],
          ['Hairline', '±0'],
          ['Symmetry', '+2']
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/[0.04] p-2">
            <p className="text-[11px] text-white/45">{k}</p>
            <p className={cn('text-lg font-black', v.startsWith('+') ? 'text-emerald-300' : 'text-white/60')}>{v}</p>
          </div>
        ))}
      </div>
    </MockFrame>
  )
}

/* ---------- Sections ---------- */

const PROBLEMS = [
  {
    title: 'Advice written for someone else',
    text: 'Videos and threads tell everyone the same thing. A cut that suits an oval face can make a long face look longer.'
  },
  {
    title: 'Expensive guesses',
    text: 'A haircut you regret takes weeks to grow out. Frames, products and color jobs cost real money before you know if they suit you.'
  },
  {
    title: 'No way to tell if it works',
    text: 'Without a baseline you cannot see progress, so motivation fades after two weeks and you are back to scrolling.'
  }
]

const FEATURES = [
  {
    icon: ScanFace,
    eyebrow: 'Analyze',
    title: 'Know your face, not faces in general',
    text: 'A full face scan with a PSL estimate and nine sub-scores, plus eleven focused AI reports: face shape, jawline, eyes, symmetry, haircut ideas, women’s styling, a 30-day planner and photo comparisons.',
    points: ['Clear strengths and the one lever that matters most', 'Honest estimates, explained, never a verdict on your worth', `Up to ${appConfig.pro.dailyAnalyses} AI analyses a day`],
    mock: <ScanMock />
  },
  {
    icon: Wand2,
    eyebrow: 'Try on',
    title: 'See it on you before you commit',
    text: 'The try-on studio puts a haircut, hair color, beard, glasses or a shaved head on your own photo, with a before/after slider. Show the result to your barber instead of a stranger’s picture.',
    points: ['30 haircuts sorted for your face shape', 'Hair colors, 8 beard styles, 8 frame shapes', `${Math.floor(100 / appConfig.credits.tryOn)} looks every month`],
    mock: <TryOnMock />
  },
  {
    icon: ListChecks,
    eyebrow: 'Follow',
    title: 'A plan you can actually stick to',
    text: 'Turn any report into a daily checklist that syncs across your devices. Your AI coach knows your scan and what is still open, so its answers are about you.',
    points: ['Small weekly tasks for hair, skin, grooming and style', 'A coach that never recommends surgery or risky shortcuts', 'Pick up where you left off on any device'],
    mock: <PlanMock />
  },
  {
    icon: LineChart,
    eyebrow: 'Track',
    title: 'Proof that it is working',
    text: 'Check in once a month with the same light and angle. Aura shows how your scores moved since your first scan and compares two photos side by side.',
    points: ['Score history and per-metric changes', 'Before/after photo comparison', 'A reminder on your dashboard when the next check-in is due'],
    mock: <ProgressMock />
  }
]

const COMPARE = [
  ['Face rating app', '$9.99–24.99 / month', 'Score, little guidance'],
  ['Hairstyle try-on app', '$4.99–17.99 / month', 'Hair only'],
  ['Skin or coaching app', '$4.95–9.99 / month', 'No face analysis']
]

const FAQ = [
  ['Can I cancel anytime?', 'Yes. Cancel in your account settings before the renewal date and you will not be charged again. Pro stays active until the end of the period you paid for.'],
  ['What is included in the free version?', 'The previews on every tool page: face shape, symmetry, canthal tilt and eye shape, measured on your device. Free accounts can also try three coach messages.'],
  ['Is there a limit?', `AI analyses have a fair-use limit of ${appConfig.pro.dailyAnalyses} a day. The try-on studio includes ${Math.floor(100 / appConfig.credits.tryOn)} looks a month; they refill on your billing date and do not roll over.`],
  ['What happens to my photos?', 'Free previews never leave your device. For AI reports and try-ons, the photo goes to our AI processing service to create the result. We never sell or share photos.'],
  ['Is this medical or cosmetic advice?', 'No. Aura gives styling, grooming and habit suggestions from photos. It does not diagnose anything and does not recommend surgery, medication or bone-changing exercises.'],
  ['Monthly or yearly?', `Yearly costs $${PRO_PLANS.find((p) => p.interval === 'yearly')?.price.toFixed(2)} once, about $${PRO_PLANS.find((p) => p.interval === 'yearly')?.monthly.toFixed(2)} a month, ${yearlySaving()}% less than paying monthly. Monthly is $${PRO_PLANS.find((p) => p.interval === 'monthly')?.price.toFixed(2)} and you can cancel after any month.`]
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold"
      >
        {q}
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <div className={cn('grid transition-all duration-300', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <p className="overflow-hidden px-5 text-sm leading-relaxed text-white/60">
          <span className="block pb-4">{a}</span>
        </p>
      </div>
    </div>
  )
}

export function ProSales({
  signedIn,
  returnTo,
  placement,
  onActivated,
  intro,
  beforeCheckout
}: {
  signedIn: boolean
  returnTo: string
  placement: string
  onActivated?: () => void | Promise<void>
  /** Optional line that ties the page to where the visitor came from. */
  intro?: string
  /** Called right before sign-up or checkout, e.g. to keep a chosen photo. */
  beforeCheckout?: () => void
}) {
  const yearly = PRO_PLANS.find((p) => p.interval === 'yearly')
  const heroRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)
  const [sticky, setSticky] = useState(false)
  const pricingId = `pro-pricing-${placement.replace(/[^a-z0-9]+/gi, '-')}`

  useEffect(() => {
    posthog.capture('pro_sales_viewed', { placement })
    let heroOut = false,
      pricingIn = false
    const update = () => setSticky(heroOut && !pricingIn)
    const heroIo = new IntersectionObserver(([e]) => {
      heroOut = !e.isIntersecting && e.boundingClientRect.top < 0
      update()
    })
    const priceIo = new IntersectionObserver(([e]) => {
      pricingIn = e.isIntersecting || e.boundingClientRect.top < 0
      update()
    })
    if (heroRef.current) heroIo.observe(heroRef.current)
    if (pricingRef.current) priceIo.observe(pricingRef.current)
    return () => {
      heroIo.disconnect()
      priceIo.disconnect()
    }
  }, [placement])

  function goToPricing() {
    posthog.capture('pro_sales_cta', { placement })
    document.getElementById(pricingId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative space-y-28 sm:space-y-36" onClickCapture={beforeCheckout}>
      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0c0a12] px-6 py-14 sm:px-12 sm:py-20">
        <div aria-hidden className="animate-glow pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-600/35 via-violet-600/30 to-sky-500/20 blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Eyebrow>Aura Pro</Eyebrow>
            {intro && <p className="mt-4 text-white/60">{intro}</p>}
            <h2 className="mt-4 text-4xl font-black leading-[1.05] sm:text-6xl">
              Stop guessing
              <br />
              <span className="bg-gradient-to-r from-fuchsia-300 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">what to change.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
              One app that tells you what suits your face, shows it on you before you commit, and keeps you on track until it shows.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={goToPricing}
                className="btn-gradient rounded-2xl px-7 py-4 text-lg font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:brightness-110"
              >
                Get Aura Pro
              </button>
              <p className="text-sm text-white/50">
                From ${yearly?.monthly.toFixed(2)} a month
                <br />
                cancel anytime
              </p>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="animate-float">
              <TryOnMock />
            </div>
            <div className="animate-float absolute -bottom-10 -left-8 hidden w-48 rounded-2xl border border-white/10 bg-[#141020]/95 p-4 shadow-2xl backdrop-blur sm:block" style={{ animationDelay: '-2s' }}>
              <p className="text-[10px] uppercase tracking-wider text-white/45">Face shape</p>
              <p className="text-xl font-black">Oblong</p>
              <p className="mt-1 text-[11px] text-white/55">Volume at the sides balances length</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => window.scrollBy({ top: 520, behavior: 'smooth' })} className="relative mx-auto mt-14 flex items-center gap-2 text-sm text-white/40 hover:text-white/70">
          See how it works <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      </section>

      {/* Problem */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">Looksmaxxing advice is loud, generic and expensive.</h2>
          <p className="mt-5 text-lg text-white/55">Most people try a few tips, spend money on the wrong cut or product, see no clear difference and give up.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <div className="h-full rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
                  <X className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-black">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-white/55">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Solution loop */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The solution</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">One selfie in. A plan that fits you out.</h2>
          <p className="mt-5 text-lg text-white/55">Aura Pro connects the four steps that usually live in four different apps.</p>
        </Reveal>
        <div className="relative mt-14 grid gap-5 md:grid-cols-4">
          <div aria-hidden className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-fuchsia-500/0 via-fuchsia-500/60 to-violet-500/0 md:block" />
          {FEATURES.map((f, i) => (
            <Reveal key={f.eyebrow} delay={i * 140} className="relative text-center">
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-[#140f1d] shadow-[0_0_40px_-10px_rgba(217,70,239,0.7)]">
                <f.icon className="h-7 w-7 text-fuchsia-200" aria-hidden />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Step {i + 1}</p>
              <h3 className="mt-1 text-xl font-black">{f.eyebrow}</h3>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm text-white/55">{f.title}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Feature deep dives */}
      {FEATURES.map((f, i) => (
        <section key={f.eyebrow} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className={cn(i % 2 === 1 && 'lg:order-2')}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/70">
              <f.icon className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden /> {f.eyebrow}
            </span>
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{f.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/60">{f.text}</p>
            <ul className="mt-6 space-y-3">
              {f.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-white/80">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20">
                    <Check className="h-3 w-3 text-fuchsia-200" aria-hidden />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150} className={cn('mx-auto w-full max-w-md', i % 2 === 1 && 'lg:order-1')}>
            {f.mock}
          </Reveal>
        </section>
      ))}

      {/* Compare */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Everything in one place</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">Three apps’ worth, for less than one.</h2>
          <p className="mt-5 text-white/55">Typical prices of single-purpose apps in the App Store, October 2026.</p>
        </Reveal>
        <Reveal delay={120} className="mx-auto mt-10 max-w-3xl">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
            {COMPARE.map(([name, price, note]) => (
              <div key={name} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.02] px-6 py-4">
                <span>
                  <span className="block font-bold text-white/80">{name}</span>
                  <span className="text-xs text-white/40">{note}</span>
                </span>
                <span className="font-bold text-white/50 line-through decoration-white/30">{price}</span>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-fuchsia-600/25 to-violet-600/25 px-6 py-5">
              <span>
                <span className="block text-lg font-black">Aura Pro</span>
                <span className="text-xs text-white/60">Analysis, try-ons, plan, coach and progress</span>
              </span>
              <span className="text-2xl font-black">${yearly?.monthly.toFixed(2)} / month</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Trust */}
      <section className="grid gap-5 md:grid-cols-3">
        {[
          [Eye, 'Free previews stay on your device', 'Face shape, symmetry and eye geometry are measured in your browser. Nothing is uploaded.'],
          [ShieldCheck, 'Honest by design', 'Estimates come with their limits. No fake precision, no surgery pitches, no judgment of your worth.'],
          [Lock, 'Your photos are yours', 'We never sell or share photos. Cancel anytime in settings; no emails to write, no hoops.']
        ].map(([Icon, title, text], i) => {
          const I = Icon as typeof Eye
          return (
            <Reveal key={title as string} delay={i * 120}>
              <div className="h-full rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-7">
                <I className="h-6 w-6 text-emerald-300" aria-hidden />
                <h3 className="mt-4 text-lg font-black">{title as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{text as string}</p>
              </div>
            </Reveal>
          )
        })}
      </section>

      {/* Pricing */}
      <section ref={pricingRef}>
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <Eyebrow>Simple pricing</Eyebrow>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">One plan. Everything included.</h2>
        </Reveal>
        <Reveal delay={100} className="mx-auto max-w-2xl">
          <ProPaywall
            id={pricingId}
            signedIn={signedIn}
            returnTo={returnTo}
            placement={placement}
            onActivated={onActivated}
            headline="Aura Pro"
            subline="Analysis, try-on studio, personal plan, AI coach and progress tracking."
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
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 60}>
              <FaqItem q={q} a={a} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2.5rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-700/30 via-[#120d1c] to-violet-700/30 px-6 py-16 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-fuchsia-200" aria-hidden />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-black sm:text-5xl">Your next look should not be a guess.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">Start with your scan today and see the first changes at your next monthly check-in.</p>
          <button type="button" onClick={goToPricing} className="mt-8 rounded-2xl bg-white px-8 py-4 text-lg font-black text-black transition hover:bg-white/90">
            Get Aura Pro
          </button>
        </section>
      </Reveal>

      {/* Sticky CTA */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0a12]/90 px-4 py-3 backdrop-blur-xl transition-transform duration-300 print:hidden',
          sticky ? 'translate-y-0' : 'translate-y-full'
        )}
        aria-hidden={!sticky}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-sm">
            <span className="font-black">Aura Pro</span>
            <span className="text-white/55"> · from ${yearly?.monthly.toFixed(2)} / month · cancel anytime</span>
          </p>
          <button type="button" tabIndex={sticky ? 0 : -1} onClick={goToPricing} className="btn-gradient shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            Get Pro
          </button>
        </div>
      </div>
    </div>
  )
}

/** Short teaser card that links into the long page on the same screen. */
export function ProTeaser({ targetId, title, text }: { targetId: string; title: string; text: string }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-600/20 via-[#120d1c] to-violet-600/20 p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Aura Pro
      </div>
      <p className="mt-3 text-2xl font-black">{title}</p>
      <p className="mt-2 text-sm text-white/60">{text}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
        {[
          [ScanFace, 'AI report'],
          [Wand2, 'Try-ons'],
          [ListChecks, 'Plan'],
          [MessageCircle, 'Coach'],
          [LineChart, 'Progress']
        ].map(([Icon, label]) => {
          const I = Icon as typeof ScanFace
          return (
            <span key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
              <I className="h-3 w-3" aria-hidden /> {label as string}
            </span>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
        className="btn-gradient mt-5 w-full rounded-2xl px-5 py-3.5 font-bold text-white"
      >
        See what Pro does for you ↓
      </button>
    </div>
  )
}
