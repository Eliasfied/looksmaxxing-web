'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

const FACE_SHAPES = ['Oval', 'Square', 'Round', 'Oblong', 'Heart', 'Diamond'] as const
type FaceShape = (typeof FACE_SHAPES)[number]

const HAIRSTYLES_BY_SHAPE: Record<FaceShape, string[]> = {
  Oval: ['Curtains', 'Quiff', 'Textured Crop', 'Wolf Cut'],
  Square: ['Buzz Cut', 'Crew Cut', 'French Crop', 'High Fade'],
  Round: ['Modern Middle Part', 'Mid Fade', 'Low Fade', 'Slick Back (Natural)'],
  Oblong: ['Man Bun', 'Low Taper', 'Bro Flow', 'Modern Shag'],
  Heart: ['Ivy League', 'Classic Side Part', 'Pompadour', 'Caesar Cut'],
  Diamond: ['Two-Block', 'Disconnected Undercut', 'Modern Mullet', 'Long Layers'],
}

interface TryOnResult {
  hairstyle: string
  imageUrl: string
}

interface Props {
  defaultFaceShape: string | null
}

export function HaircutsClient({ defaultFaceShape }: Props) {
  const normalizedDefault = FACE_SHAPES.find(
    s => s.toLowerCase() === defaultFaceShape?.toLowerCase()
  ) ?? 'Oval'

  const [activeShape, setActiveShape] = useState<FaceShape>(normalizedDefault)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [userImage, setUserImage] = useState<File | null>(null)
  const [userImagePreview, setUserImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TryOnResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUserImage(file)
    const url = URL.createObjectURL(file)
    setUserImagePreview(url)
  }

  async function tryOn(style: string) {
    if (!userImage) {
      setSelectedStyle(style)
      inputRef.current?.click()
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('image', userImage)
      form.append('hairstyle', style)
      form.append('faceShape', activeShape)

      const res = await fetch('/api/haircut', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }
      setResult({ hairstyle: style, imageUrl: data.imageUrl })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFile(file)
    if (selectedStyle) {
      tryOn(selectedStyle)
    }
  }

  const hairstyles = HAIRSTYLES_BY_SHAPE[activeShape]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Hairstyle Try-On</h1>
        <p className="text-[#666] text-sm mt-1">Pick a style, upload your photo, see the result</p>
      </div>

      {/* Face shape selector */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">Face Shape</p>
        <div className="flex flex-wrap gap-2">
          {FACE_SHAPES.map(shape => (
            <button
              key={shape}
              onClick={() => { setActiveShape(shape); setResult(null) }}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                activeShape === shape
                  ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white'
                  : 'border border-white/10 text-[#666] hover:text-white hover:border-white/20'
              )}
            >
              {shape}
            </button>
          ))}
        </div>
        {defaultFaceShape && (
          <p className="mt-2 text-xs text-[#444]">
            Detected from your scan:{' '}
            <span className="text-purple-400 capitalize">{defaultFaceShape}</span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Hairstyle grid */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
            Styles for {activeShape} face
          </p>
          <div className="grid grid-cols-2 gap-3">
            {hairstyles.map(style => (
              <button
                key={style}
                onClick={() => tryOn(style)}
                disabled={loading}
                className={cn(
                  'group relative rounded-xl border overflow-hidden text-left transition-all',
                  result?.hairstyle === style
                    ? 'border-fuchsia-500/50'
                    : 'border-white/5 hover:border-purple-500/30',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={`/images/hairstyle/${encodeURIComponent(style)}.webp`}
                    alt={style}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {result?.hairstyle === style && (
                    <div className="absolute inset-0 ring-2 ring-fuchsia-500 rounded-xl" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold text-white leading-tight">{style}</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {userImage ? 'Try on →' : 'Upload photo to try'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel: photo + result */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">Your Photo</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleImagePick}
            />
            {!userImagePreview ? (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/40 transition-colors p-10 text-center"
              >
                <p className="text-sm font-semibold text-white mb-1">Upload your photo</p>
                <p className="text-xs text-[#555]">Frontal, good lighting</p>
              </button>
            ) : (
              <div className="relative">
                <img
                  src={userImagePreview}
                  alt="Your photo"
                  className="w-full rounded-xl object-cover max-h-64"
                />
                <button
                  onClick={() => { setUserImage(null); setUserImagePreview(null); setResult(null) }}
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] py-16">
              <div className="h-8 w-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin mb-3" />
              <p className="text-sm text-[#666]">Generating your look…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {result && !loading && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
                Result: {result.hairstyle}
              </p>
              <img
                src={result.imageUrl}
                alt={`${result.hairstyle} try-on`}
                className="w-full rounded-xl object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
