'use client'

/* eslint-disable @next/next/no-img-element -- local data-URL previews never go to an image service */

import type { FaceGeometry, FaceShapeName } from '../../../config/face-geometry'

const SHAPE_NOTE: Record<FaceShapeName, string> = {
  Oval: 'Balanced length and width; most haircuts and frames work.',
  Round: 'Similar length and width with soft angles; height on top adds length.',
  Square: 'Strong, wide jaw close to cheek width; texture softens it.',
  Oblong: 'Longer than it is wide; volume at the sides balances length.',
  Heart: 'Wider forehead, narrower jaw; side-swept fringes balance it.',
  Diamond: 'Cheekbones are the widest point; fuller sides at the top help.'
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 34,
    c = 2 * Math.PI * r
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#aura-ring)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
        <defs>
          <linearGradient id="aura-ring" x1="0" x2="1">
            <stop offset="0%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black">{value}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      </span>
    </div>
  )
}

export function FacePreview({ geometry, photo }: { geometry: FaceGeometry; photo: string }) {
  const shapes = Object.entries(geometry.faceShape.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const top = shapes[0]?.[1] || 1
  const tilt = geometry.canthalTilt
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <img src={photo} alt="Your photo" className="h-full max-h-56 w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur">
            ● Measured on your device
          </span>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300">Likely face shape</p>
          <p className="mt-1 text-3xl font-black">{geometry.faceShape.shape}</p>
          <p className="mt-1 text-sm text-white/60">{SHAPE_NOTE[geometry.faceShape.shape]}</p>
          <div className="mt-4 space-y-2">
            {shapes.map(([shape, score]) => (
              <div key={shape} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-white/60">{shape}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
                    style={{ width: `${Math.round((score / top) * 100)}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <Ring value={geometry.symmetry.score} label="symmetry" />
          <p className="text-xs leading-relaxed text-white/55">
            Most balanced: <span className="text-white">{geometry.symmetry.mostBalanced}</span>
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Canthal tilt</p>
          <p className="mt-1 text-2xl font-black capitalize">{tilt.label}</p>
          <p className="mt-1 text-xs text-white/55">
            about {tilt.mean > 0 ? '+' : ''}
            {tilt.mean}° (left {tilt.left}°, right {tilt.right}°)
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Eyes</p>
          <p className="mt-1 text-2xl font-black capitalize">{geometry.eyes.shape}</p>
          <p className="mt-1 text-xs text-white/55">Spacing: {geometry.eyes.spacingLabel}</p>
        </div>
      </div>
      {geometry.warnings.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-200">
          {geometry.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-white/40">
        Geometry from a single photo. Camera angle, lens and hair move these numbers; they describe this
        photo, not your worth or a fixed trait.
      </p>
    </div>
  )
}
