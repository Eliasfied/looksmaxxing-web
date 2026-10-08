'use client'

/* eslint-disable @next/next/no-img-element -- Local data-URL previews must not be sent to an image-optimization service. */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import type { ToolDefinition } from '@/lib/tool-report'

async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12_000_000)
    throw new Error('Choose a JPG, PNG or WebP photo smaller than 12 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this photo.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function ToolUpload({ tool }: { tool: ToolDefinition }) {
  const router = useRouter()
  const [image, setImage] = useState(''),
    [comparisonImage, setComparisonImage] = useState('')
  const [preferences, setPreferences] = useState(
    tool.audience === 'women' ? 'Feminine styling; practical, low-maintenance options.' : ''
  )
  const [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(false),
    [preparing, setPreparing] = useState(false)
  const [error, setError] = useState(''),
    [website, setWebsite] = useState('')
  async function choose(file: File | undefined, comparison: boolean) {
    if (!file) return
    setError('')
    setPreparing(true)
    try {
      const photo = await preparePhoto(file)
      if (comparison) setComparisonImage(photo)
      else setImage(photo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open photo')
    } finally {
      setPreparing(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const source = new URLSearchParams(window.location.search).get('source') ?? '/tools'
    posthog.capture('tool_upload_started', { tool: tool.slug, source })
    try {
      const response = await fetch('/api/tools/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: tool.slug,
          image,
          comparisonImage,
          preferences,
          consent,
          adult: consent,
          source,
          website
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Analysis failed. Please try again.')
      posthog.capture('tool_preview_created', { tool: tool.slug, source })
      router.push(`/tools/result/${result.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setLoading(false)
    }
  }
  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
          {tool.audience === 'women' ? 'Made for your style goals' : 'Start with your photo'}
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{tool.name}</h1>
        <p className="mt-5 text-lg leading-relaxed text-white/65">{tool.description}</p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section className="order-last lg:order-first">
          <ol className="space-y-5">
            {[
              'Upload your photo — no account needed.',
              'See your styling-potential estimate and a locked report preview.',
              'Create an account and unlock your report for $2.99 once.'
            ].map((text, i) => (
              <li key={text} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/30 text-fuchsia-300">
                  {i + 1}
                </span>
                <span className="pt-1 text-white/80">{text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-9 rounded-2xl border border-white/10 p-5">
            <h2 className="font-bold">Inside your report</h2>
            <ul className="mt-3 space-y-2 text-white/65">
              {tool.resultLabels.map((label) => (
                <li key={label}>✓ {label}</li>
              ))}
            </ul>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-white/50">
            A subjective AI perspective on styling, not a prediction of future attractiveness.
            Photos, lighting and preferences affect the result.
          </p>
        </section>
        <form
          onSubmit={submit}
          className="order-first lg:order-last rounded-3xl border border-white/10 bg-[#121019] p-6 sm:p-8"
        >
          <label className="block font-semibold" htmlFor="photo">
            {tool.requiresComparison ? 'Earlier photo' : 'Your photo'}
          </label>
          <p className="mb-4 mt-1 text-sm text-white/55">
            One face, even lighting, neutral expression. JPG, PNG or WebP.
          </p>
          {image && (
            <img
              src={image}
              alt="Your selected photo"
              className="mb-4 max-h-64 w-full rounded-xl object-contain"
            />
          )}
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void choose(e.target.files?.[0], false)}
            disabled={loading || preparing}
            className="w-full rounded-xl border border-dashed border-white/25 p-4 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-white"
          />
          {tool.requiresComparison && (
            <div className="mt-5">
              <label htmlFor="comparison" className="mb-2 block font-semibold">
                Recent photo
              </label>
              {comparisonImage && (
                <img
                  src={comparisonImage}
                  alt="Your recent photo"
                  className="mb-3 max-h-48 w-full rounded-xl object-contain"
                />
              )}
              <input
                id="comparison"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void choose(e.target.files?.[0], true)}
                disabled={loading || preparing}
                className="w-full text-sm"
              />
              <p className="mt-2 text-xs text-white/55">
                Use similar lighting, angle and expression. This cannot establish whether mewing
                caused a change.
              </p>
            </div>
          )}
          <label htmlFor="preferences" className="mb-2 mt-6 block font-semibold">
            Your preferences <span className="font-normal text-white/50">(optional)</span>
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
          <div className="hidden" aria-hidden="true">
            <label>
              Website
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-white/65">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-1"
            />
            <span>
              I am 18 or older and these are my photos. I agree to AI processing to create this
              report. The free preview shows only the potential estimate; the full report is paid.
            </span>
          </label>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={
              loading ||
              preparing ||
              !image ||
              !consent ||
              Boolean(tool.requiresComparison && !comparisonImage)
            }
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-4 text-lg font-bold transition hover:brightness-110 disabled:opacity-40"
          >
            {loading
              ? 'Preparing your personal report…'
              : preparing
                ? 'Preparing photo…'
                : 'See my potential →'}
          </button>
          <p aria-live="polite" className="mt-3 text-center text-xs text-white/50">
            {loading
              ? 'Usually around 20–60 seconds. Keep this page open.'
              : 'No account or payment needed for the preview.'}
          </p>
        </form>
      </div>
    </div>
  )
}
