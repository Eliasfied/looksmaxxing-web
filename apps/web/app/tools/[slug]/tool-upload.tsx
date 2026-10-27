'use client'

/* eslint-disable @next/next/no-img-element -- Local data-URL previews must not be sent to an image-optimization service. */

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Lock, Sparkles, Upload } from 'lucide-react'
import type { ToolDefinition } from '@/lib/tool-report'
import { FacePreview } from '@/components/face-preview'
import { preparePhoto } from '@/lib/prepare-photo'
import { ProSales, ProTeaser } from '@/components/pro-sales'
import type { FaceGeometry } from '../../../../../config/face-geometry'
import { analyzePhoto, imageFrom, preloadFaceLandmarker } from '../../../../../config/face-landmarker'

type Me = { signedIn: boolean; pro: boolean }
type Pending = { image: string; comparisonImage: string; preferences: string }

const pendingKey = (slug: string) => `aura-pending-${slug}`

export function ToolUpload({ tool }: { tool: ToolDefinition }) {
  const router = useRouter()
  const params = useSearchParams()
  const resume = params.get('resume') === '1'
  const source = params.get('source') ?? '/tools'
  const [me, setMe] = useState<Me | null>(null)
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
    if (!saved?.image) return
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

  const ready = Boolean(image && (!tool.requiresComparison || comparisonImage))

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
          {geometry ? (
            <FacePreview geometry={geometry} photo={image} />
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/40">Free preview</p>
              <p className="mt-3 text-xl font-bold">Face shape, symmetry, canthal tilt and eye shape</p>
              <p className="mt-2 text-white/55">Measured instantly in your browser when you choose a photo.</p>
            </div>
          )}

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Lock className="h-4 w-4 text-fuchsia-300" aria-hidden /> AI report with Aura Pro
            </p>
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
            me && (
              <ProTeaser
                targetId="aura-pro"
                title={geometry ? 'Want the full picture?' : 'The free preview is just the start'}
                text={
                  geometry
                    ? 'Aura Pro writes your personal report from this photo and shows the looks that suit you on your own face.'
                    : 'Aura Pro turns your photo into a personal report, try-ons, a plan and a coach.'
                }
              />
            )
          )}
        </section>
      </div>

      {me && !me.pro && (
        <div id="aura-pro" className="mt-28 scroll-mt-10">
          <ProSales
            signedIn={me.signedIn}
            returnTo={`/tools/${tool.slug}?resume=1`}
            placement={`tool:${tool.slug}`}
            intro={geometry ? `Your free preview says ${geometry.faceShape.shape.toLowerCase()} face. Here is what Pro does with that.` : undefined}
            beforeCheckout={rememberForCheckout}
            onActivated={() => {
              autoRan.current = false
              setMe({ signedIn: true, pro: true })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>
      )}
    </div>
  )
}
