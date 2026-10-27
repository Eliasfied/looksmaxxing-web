'use client'

/* eslint-disable @next/next/no-img-element -- user photos and FAL results are shown as-is */

import { useState } from 'react'
import posthog from 'posthog-js'
import { Download, ImagePlus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FACE_SHAPES, TRYON_CATALOG, type FaceShape, type TryOnType } from '@/lib/tryon-catalog'
import { dataUrlToBlob, preparePhoto } from '@/lib/prepare-photo'
import { ProPaywall } from '@/components/pro-paywall'

type Result = { type: TryOnType; label: string; url: string }

function BeforeAfter({ before, after, label }: { before: string; after: string; label: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black">
      <img src={after} alt={`${label} try-on`} className="block w-full" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="Your original photo" className="h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="h-full w-0.5 -translate-x-1/2 bg-white/80" />
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold backdrop-blur">Before</span>
      <span className="absolute right-3 top-3 rounded-full bg-fuchsia-600/80 px-2.5 py-1 text-xs font-bold backdrop-blur">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-x-4 bottom-4 accent-fuchsia-500"
      />
    </div>
  )
}

export function StudioClient({
  pro,
  faceShape,
  tryOnsLeft
}: {
  pro: boolean
  faceShape: string | null
  tryOnsLeft: number
}) {
  const detected = FACE_SHAPES.find((s) => s.toLowerCase() === faceShape?.toLowerCase()) ?? null
  const [type, setType] = useState<TryOnType>('hair')
  const [shape, setShape] = useState<FaceShape | null>(detected)
  const [photo, setPhoto] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [left, setLeft] = useState(tryOnsLeft)
  const [results, setResults] = useState<Result[]>([])
  const category = TRYON_CATALOG.find((c) => c.type === type)!
  const options =
    type === 'hair' && shape ? [...category.options].sort((a, b) => Number(!!b.shapes?.includes(shape)) - Number(!!a.shapes?.includes(shape))) : category.options
  const current = results[0]

  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      setPhoto(await preparePhoto(file, 1024))
      setResults([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this photo.')
    }
  }

  async function tryOn(optionId: string, label: string) {
    if (!photo) {
      setError('Add a photo first.')
      return
    }
    setBusy(optionId)
    setError('')
    try {
      const form = new FormData()
      form.append('image', await dataUrlToBlob(photo), 'photo.jpg')
      form.append('type', type)
      form.append('option', optionId)
      if (shape) form.append('faceShape', shape)
      const res = await fetch('/api/tryon', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed. Please try again.')
      setResults((r) => [{ type, label, url: data.imageUrl }, ...r].slice(0, 12))
      setLeft(data.remaining)
      posthog.capture('tryon_generated', { type, option: optionId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Try-on studio</p>
          <h1 className="mt-2 text-4xl font-black">See it on you first.</h1>
          <p className="mt-2 max-w-xl text-white/60">{category.blurb}</p>
        </div>
        {pro && (
          <p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
            <span className="font-black">{left}</span> <span className="text-white/55">looks left this month</span>
          </p>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Try-on type">
        {TRYON_CATALOG.map((c) => (
          <button
            key={c.type}
            role="tab"
            aria-selected={type === c.type}
            onClick={() => setType(c.type)}
            className={cn(
              'shrink-0 rounded-full px-5 py-2 text-sm font-bold transition',
              type === c.type ? 'bg-white text-black' : 'border border-white/10 text-white/65 hover:text-white'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!pro ? (
        <ProPaywall
          signedIn
          returnTo="/studio"
          placement="studio"
          headline="The try-on studio is part of Aura Pro"
          subline="Haircuts, hair color, beards, glasses and a bald preview, on your own photo, before you commit."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5">
            <label className="flex cursor-pointer items-center gap-4 rounded-[1.5rem] border border-dashed border-white/20 bg-white/[0.02] p-4 transition hover:border-fuchsia-400/50">
              {photo ? (
                <img src={photo} alt="Your photo" className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5">
                  <ImagePlus className="h-6 w-6 text-fuchsia-300" aria-hidden />
                </span>
              )}
              <span>
                <span className="block font-bold">{photo ? 'Change photo' : 'Add a front-facing photo'}</span>
                <span className="text-sm text-white/50">Good light, hair visible, no hat</span>
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
            </label>

            {type === 'hair' && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">
                  Face shape {detected && <span className="normal-case text-fuchsia-300">· from your scan: {detected}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {FACE_SHAPES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-xs font-bold transition',
                        shape === s ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600' : 'border border-white/10 text-white/60 hover:text-white'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {options.map((o) => {
                const fits = type === 'hair' && shape && o.shapes?.includes(shape)
                return (
                  <button
                    key={o.id}
                    onClick={() => void tryOn(o.id, o.label)}
                    disabled={Boolean(busy) || left < 1}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border text-left transition disabled:cursor-not-allowed',
                      busy === o.id ? 'border-fuchsia-400' : 'border-white/10 hover:border-fuchsia-400/40',
                      busy && busy !== o.id && 'opacity-50'
                    )}
                  >
                    {o.image ? (
                      <img src={o.image} alt="" className="aspect-[4/5] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-sky-500/10">
                        <Sparkles className="h-6 w-6 text-white/40" aria-hidden />
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                      <span className="block text-sm font-bold leading-tight">{o.label}</span>
                      {fits && <span className="text-[11px] font-semibold text-fuchsia-300">Suits your face</span>}
                      {busy === o.id && <span className="text-[11px] text-white/70">Generating…</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            {left < 1 && <p className="text-sm text-amber-200">Your looks for this month are used up. They refill on your next billing date.</p>}
            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>

          <section className="space-y-4">
            {current && photo ? (
              <>
                <BeforeAfter before={photo} after={current.url} label={current.label} />
                <a
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-300"
                >
                  <Download className="h-4 w-4" aria-hidden /> Open full size
                </a>
              </>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-10 text-center text-white/45">
                {busy ? 'Creating your look, usually 10–30 seconds…' : 'Add your photo and pick a style. Your result appears here with a before/after slider.'}
              </div>
            )}
            {results.length > 1 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">This session</p>
                <div className="flex gap-2 overflow-x-auto">
                  {results.map((r, i) => (
                    <button
                      key={r.url}
                      onClick={() => setResults((all) => [all[i], ...all.filter((_, k) => k !== i)])}
                      className="shrink-0 overflow-hidden rounded-xl border border-white/10"
                      title={r.label}
                    >
                      <img src={r.url} alt={r.label} className="h-20 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
