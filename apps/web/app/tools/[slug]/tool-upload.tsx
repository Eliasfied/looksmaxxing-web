'use client'

/* eslint-disable @next/next/no-img-element -- Local data-URL previews must not be sent to an image-optimization service. */

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Lock, Sparkles, Upload } from 'lucide-react'
import type { ToolDefinition } from '@/lib/tool-report'
import { FacePreview } from '@/components/face-preview'
import { preparePhoto } from '@/lib/prepare-photo'
import { ProTeaser } from '@/components/pro-sales'
import { GlowSales } from '@/components/glow-sales'
import { GlowQuickBuy } from '@/components/glow-offer'
import { GlowDayOne } from '@/components/glow-day-one'
import { saveGlowPhoto } from '@/lib/glow-handoff'
import { GLOW } from '@/lib/glow-offer'
import { cn } from '@/lib/utils'
import type { FaceGeometry } from '../../../../../config/face-geometry'
import { analyzePhoto, imageFrom, preloadFaceLandmarker } from '../../../../../config/face-landmarker'

type Me = { signedIn: boolean; pro: boolean }
type Pending = { image: string; comparisonImage: string; preferences: string }

const pendingKey = (slug: string) => `aura-pending-${slug}`

// Tools people open to get a number. Their free preview has no score, so the
// card under it says plainly where the score is: in the plan's start scan.
const SCORE_TOOLS = new Set(['psl-score-calculator', 'ai-face-rating'])

export function ToolUpload({ tool }: { tool: ToolDefinition }) {
  const router = useRouter()
  const params = useSearchParams()
  const resume = params.get('resume') === '1'
  // Set on the way back from sign-up when the visitor had already clicked buy.
  const checkoutRequested = resume && params.get('checkout') === '1'
  const source = params.get('source') ?? '/tools'
  const [me, setMe] = useState<Me | null>(null)
  const [nothingToRestore, setNothingToRestore] = useState(false)
  const [stickyOn, setStickyOn] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const quickBuyRef = useRef<HTMLDivElement>(null)
  const salesRef = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState(''),
    [comparisonImage, setComparisonImage] = useState('')
  const [geometry, setGeometry] = useState<FaceGeometry | null>(null)
  const [preferences, setPreferences] = useState(
    tool.audience === 'women' ? 'Feminine styling; practical, low-maintenance options.' : ''
  )
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState<'' | 'preparing' | 'measuring' | 'reporting'>('')
  const [error, setError] = useState('')
  const autoRan = useRef(false)

  useEffect(() => {
    preloadFaceLandmarker()
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ signedIn: false, pro: false }))
  }, [])

  // Back from sign-up/checkout: restore the photo the visitor already chose.
  useEffect(() => {
    if (!resume) return
    let saved: Pending | null = null
    try {
      saved = JSON.parse(sessionStorage.getItem(pendingKey(tool.slug)) ?? 'null')
    } catch {
      /* nothing to restore */
    }
    if (!saved?.image) {
      void Promise.resolve().then(() => setNothingToRestore(true))
      return
    }
    const pending = saved
    void Promise.resolve().then(() => {
      setImage(pending.image)
      setComparisonImage(pending.comparisonImage)
      setPreferences(pending.preferences)
      setConsent(true)
      return measure(pending.image)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, tool.slug])

  async function measure(photo: string) {
    setBusy('measuring')
    setGeometry(null)
    try {
      const result = await analyzePhoto(await imageFrom(photo))
      setGeometry(result)
      posthog.capture('tool_preview_created', { tool: tool.slug, source, on_device: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not read this photo.')
    } finally {
      setBusy('')
    }
  }

  async function choose(file: File | undefined, comparison: boolean) {
    if (!file) return
    setError('')
    setBusy('preparing')
    try {
      const photo = await preparePhoto(file)
      if (comparison) {
        setComparisonImage(photo)
        setBusy('')
      } else {
        setImage(photo)
        posthog.capture('tool_upload_started', { tool: tool.slug, source })
        await measure(photo)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open photo')
      setBusy('')
    }
  }

  function rememberForCheckout() {
    try {
      sessionStorage.setItem(
        pendingKey(tool.slug),
        JSON.stringify({ image, comparisonImage, preferences } satisfies Pending)
      )
    } catch {
      /* the visitor can pick the photo again */
    }
  }

  async function runReport() {
    setBusy('reporting')
    setError('')
    try {
      const response = await fetch('/api/tools/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.slug, image, comparisonImage, preferences, consent, adult: consent, source })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Analysis failed. Please try again.')
      try {
        sessionStorage.removeItem(pendingKey(tool.slug))
      } catch {
        /* fine */
      }
      posthog.capture('tool_report_unlocked', { tool: tool.slug, source })
      router.push(`/tools/result/${result.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy('')
    }
  }

  // A visitor who just bought Pro comes back here and gets the report at once.
  useEffect(() => {
    if (resume && me?.pro && image && geometry && consent && !autoRan.current) {
      autoRan.current = true
      void runReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, me?.pro, image, geometry, consent])

  // On a phone the preview renders below the upload card, often off screen.
  // Bring it up, and record that it was actually seen, not just computed.
  useEffect(() => {
    const el = previewRef.current
    if (!geometry || !el) return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    }
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        posthog.capture('tool_preview_seen', { tool: tool.slug, source })
        io.disconnect()
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [geometry, tool.slug, source])

  const selling = Boolean(me && !me.pro)

  // Phone bar with the price while neither the buy block nor the long sales
  // section below is on screen.
  useEffect(() => {
    const buy = quickBuyRef.current,
      sales = salesRef.current
    if (!geometry || !selling || !buy || !sales || typeof IntersectionObserver === 'undefined') return
    let buyVisible = false,
      salesReached = false
    const update = () => setStickyOn(!buyVisible && !salesReached)
    const a = new IntersectionObserver(([e]) => {
      buyVisible = e.isIntersecting
      update()
    })
    const b = new IntersectionObserver(([e]) => {
      salesReached = e.isIntersecting || e.boundingClientRect.top < 0
      update()
    })
    a.observe(buy)
    b.observe(sales)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [geometry, selling])

  // Bought the plan here: the plan's questionnaire is next, and it can reuse
  // the photo the visitor already chose instead of asking for another selfie.
  function planActivated() {
    if (image) saveGlowPhoto(image)
    router.push('/glow-up')
    router.refresh()
  }

  const ready = Boolean(image && (!tool.requiresComparison || comparisonImage))
  const signedInFree = Boolean(me?.signedIn && !me.pro)
  // Open the checkout by itself only once, and only where the buy button is:
  // under the restored preview, or in the sales section if the photo is gone.
  const autoCheckoutQuick = checkoutRequested && signedInFree && Boolean(geometry)
  const autoCheckoutSales = checkoutRequested && signedInFree && nothingToRestore
  const audience = tool.audience === 'women' ? 'women' : 'men'

  return (
    <div>
      <header className="mb-10 max-w-3xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Free preview runs on your device · your photo is not uploaded
        </p>
        <h1 className="text-4xl font-black leading-tight sm:text-6xl">{tool.name}</h1>
        <p className="mt-5 text-lg leading-relaxed text-white/65">{tool.description}</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[#110e18] p-6 sm:p-8">
          <label className="block font-semibold" htmlFor="photo">
            {tool.requiresComparison ? 'Earlier photo' : 'Your photo'}
          </label>
          <p className="mb-4 mt-1 text-sm text-white/55">One face, even lighting, looking straight at the camera.</p>
          <label
            htmlFor="photo"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center transition hover:border-fuchsia-400/50 hover:bg-white/[0.04]"
          >
            {image ? (
              <img src={image} alt="Your selected photo" className="max-h-52 rounded-xl object-contain" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-fuchsia-300" aria-hidden />
                <span className="font-semibold">Choose a photo</span>
                <span className="text-xs text-white/45">JPG, PNG or WebP</span>
              </>
            )}
          </label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void choose(e.target.files?.[0], false)}
            disabled={Boolean(busy)}
            className="sr-only"
          />
          {tool.requiresComparison && (
            <div className="mt-5">
              <label htmlFor="comparison" className="mb-2 block font-semibold">
                Recent photo
              </label>
              {comparisonImage && (
                <img src={comparisonImage} alt="Your recent photo" className="mb-3 max-h-40 rounded-xl object-contain" />
              )}
              <input
                id="comparison"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void choose(e.target.files?.[0], true)}
                disabled={Boolean(busy)}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
              />
              <p className="mt-2 text-xs text-white/55">
                Use similar lighting, angle and expression. This cannot establish whether mewing caused a change.
              </p>
            </div>
          )}
          {/* Only members can run the AI report; for everyone else these fields
              sat between the photo and the free preview and pushed it off screen. */}
          {me?.pro && (
            <>
              <label htmlFor="preferences" className="mb-2 mt-6 block font-semibold">
                Your preferences <span className="font-normal text-white/50">(optional, for the AI report)</span>
              </label>
              <textarea
                id="preferences"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Your preferred style, hair length, time or budget…"
                className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white placeholder:text-white/35"
              />
              <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-white/65">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 accent-fuchsia-500"
                />
                <span>I am 18 or older and these are my photos. For the AI report I agree to AI processing of them.</span>
              </label>
            </>
          )}
          {busy && (
            <p aria-live="polite" className="mt-4 text-sm text-white/60">
              {busy === 'preparing'
                ? 'Preparing photo…'
                : busy === 'measuring'
                  ? 'Measuring your face on this device…'
                  : 'Writing your personal AI report, usually 20–60 seconds…'}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </section>

        <section className="space-y-6">
          <div ref={previewRef} className="scroll-mt-6">
            {geometry ? (
              <FacePreview geometry={geometry} photo={image} />
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/40">Free preview</p>
                <p className="mt-3 text-xl font-bold">Face shape, symmetry, canthal tilt and eye shape</p>
                <p className="mt-2 text-white/55">Measured instantly in your browser when you choose a photo.</p>
              </div>
            )}
          </div>

          {geometry && selling && me && (
            <GlowDayOne geometry={geometry} tool={tool.slug} defaultAudience={audience}>
              <div ref={quickBuyRef}>
                <GlowQuickBuy
                  id="glow-quick"
                  signedIn={me.signedIn}
                  returnTo={`/tools/${tool.slug}?resume=1`}
                  placement={`tool:${tool.slug}`}
                  beforeCheckout={rememberForCheckout}
                  onActivated={planActivated}
                  autoCheckout={autoCheckoutQuick}
                  detailsTarget="aura-pro"
                />
              </div>
            </GlowDayOne>
          )}

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Lock className="h-4 w-4 text-fuchsia-300" aria-hidden />
              {me?.pro ? `Your full ${tool.name} report` : `Also in your plan: the full ${tool.name} report`}
            </p>
            {SCORE_TOOLS.has(tool.slug) && !me?.pro && (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/[0.06] p-4">
                <span
                  aria-hidden
                  className="flex h-16 w-16 shrink-0 select-none items-center justify-center rounded-2xl bg-black/40 text-2xl font-black text-white/70 blur-[1.5px]"
                >
                  ?.?
                </span>
                <span className="text-sm leading-relaxed text-white/65">
                  <span className="block font-bold text-white">Your score estimate and 9 sub-scores</span>
                  Your plan starts with a full scan: a PSL-style estimate, what drives it, and which parts you can actually change.
                </span>
              </div>
            )}
            <ul className="mt-3 space-y-1.5 text-sm text-white/60">
              {tool.resultLabels.map((label) => (
                <li key={label}>✓ {label}</li>
              ))}
            </ul>
          </div>

          {me?.pro ? (
            <button
              onClick={() => void runReport()}
              disabled={!ready || !consent || Boolean(busy)}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <Sparkles className="h-5 w-5" aria-hidden />
              {busy === 'reporting' ? 'Writing your report…' : 'Create my full AI report'}
            </button>
          ) : (
            me &&
            !geometry && (
              <ProTeaser
                targetId="aura-pro"
                title={geometry ? 'Want the full picture?' : 'The free preview is just the start'}
                text={
                  geometry
                    ? 'The 30-day plan writes your full report from this photo, then turns it into daily steps and try-ons on your own face.'
                    : 'The 30-day plan turns your photo into a full report, a daily checklist, try-ons and a coach.'
                }
              />
            )
          )}
        </section>
      </div>

      {me && !me.pro && (
        <div id="aura-pro" ref={salesRef} className="mt-28 scroll-mt-10">
          <GlowSales
            embedded
            signedIn={me.signedIn}
            returnTo={`/tools/${tool.slug}?resume=1`}
            placement={`tool:${tool.slug}`}
            intro={geometry ? `Your free preview says ${geometry.faceShape.shape.toLowerCase()} face. Here is what your 30-day plan does with that.` : undefined}
            beforeCheckout={rememberForCheckout}
            onActivated={planActivated}
            autoCheckout={autoCheckoutSales}
          />
        </div>
      )}

      {geometry && selling && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0a12]/90 px-4 py-3 backdrop-blur-xl transition-transform duration-300 lg:hidden print:hidden',
            stickyOn ? 'translate-y-0' : 'translate-y-full'
          )}
          aria-hidden={!stickyOn}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <p className="text-sm">
              <span className="font-black">Day 1 is free</span>
              <span className="text-white/55"> · days 2–30 ${GLOW.price.toFixed(2)} once</span>
            </p>
            <button
              type="button"
              tabIndex={stickyOn ? 0 : -1}
              onClick={() => {
                posthog.capture('glow_sales_cta', { placement: `tool:${tool.slug}`, variant: 'tool-sticky' })
                document.getElementById('glow-quick')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              className="btn-gradient shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            >
              Get my plan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
