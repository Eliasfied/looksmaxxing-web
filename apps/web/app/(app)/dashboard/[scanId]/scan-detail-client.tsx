'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { FaceScan } from '@/lib/firebase/scans'

interface Props {
  scan: FaceScan
}

function metricColor(v: number) {
  if (v >= 80) return 'text-emerald-400'
  if (v >= 65) return 'text-green-400'
  if (v >= 50) return 'text-yellow-400'
  if (v >= 35) return 'text-orange-400'
  return 'text-red-400'
}

function metricDotColor(v: number) {
  if (v >= 80) return 'bg-emerald-400'
  if (v >= 65) return 'bg-green-400'
  if (v >= 50) return 'bg-yellow-400'
  if (v >= 35) return 'bg-orange-400'
  return 'bg-red-400'
}

function metricBarColor(v: number) {
  if (v >= 80) return 'from-emerald-500 to-green-400'
  if (v >= 65) return 'from-green-500 to-lime-400'
  if (v >= 50) return 'from-yellow-500 to-amber-400'
  if (v >= 35) return 'from-orange-500 to-amber-500'
  return 'from-red-600 to-red-400'
}

function pslColor(score: number) {
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6) return 'text-yellow-400'
  if (score >= 4.5) return 'text-orange-400'
  return 'text-red-400'
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-4 h-4 rounded-full border border-white/20 bg-white/5 text-[10px] text-[#555] hover:text-white hover:border-white/40 flex items-center justify-center transition-colors"
      >
        ?
      </button>
      {show && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-56 rounded-xl border border-white/10 bg-[#111] p-3 text-xs text-[#aaa] leading-relaxed shadow-xl">
          {text}
        </div>
      )}
    </span>
  )
}

function MetricRow({ label, value, tooltip, subpoints }: { label: string; value: number; tooltip: string; subpoints?: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <div className="flex justify-between items-center text-sm mb-1.5">
          <span className="flex items-center text-[#888]">
            {label}
            <Tooltip text={tooltip} />
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-bold tabular-nums ${metricColor(value)}`}>{value}/100</span>
            <svg
              className={`h-3.5 w-3.5 text-[#555] transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${metricBarColor(value)} transition-all`}
            style={{ width: `${value}%` }}
          />
        </div>
      </button>
      {open && subpoints && subpoints.length > 0 && (
        <ul className="mt-3 space-y-1.5 pl-1">
          {subpoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#666]">
              <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${metricDotColor(value)}`} />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Recommendation({ text }: { text?: string }) {
  if (!text) return null
  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-2">Recommendation</p>
      <p className="text-sm text-[#888] leading-relaxed">{text}</p>
    </div>
  )
}

const ICONS = {
  bone: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  eye: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  skin: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  symmetry: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
}

const TOOLTIPS = {
  gonialAngle: 'The angle of your jaw at the corners. A sharper, more defined angle (around 120°) is associated with higher attractiveness in men.',
  midfaceRatio: 'The vertical proportion of your midface relative to your total face length. A compact midface is considered more aesthetically ideal.',
  cheekbone: 'How much your cheekbones project relative to your face width. High, prominent cheekbones are a key marker of facial attractiveness.',
  canthalTilt: 'The angle of your eye axis from inner to outer corner. A positive (upward) tilt gives a sharper, more intense look.',
  upperEyelid: 'How much of your upper eyelid is visible. Less exposure — so-called "hunter eyes" — is associated with higher PSL scores.',
  ipd: 'The distance between your pupils relative to your face width. The ideal is roughly 46% of face width.',
  skinClarity: 'The evenness, texture, and clarity of your skin. Clean skin without blemishes or redness significantly boosts your overall score.',
  hairline: 'The shape and height of your hairline. A clean, well-defined hairline frames your face and contributes to your score.',
  symmetry: 'How symmetrical your face is from left to right. Higher means more symmetrical — perfect symmetry is extremely rare.',
}

export function ScanDetailClient({ scan }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[#555] hover:text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </Link>

      {/* Header */}
      <div className="flex gap-6 items-start">
        {scan.photoUrl && (
          <img
            src={scan.photoUrl}
            alt="Face scan photo"
            className="w-24 h-32 rounded-2xl object-cover border border-white/10 shrink-0"
          />
        )}
        <div>
          <p className="text-xs text-[#555] mb-1">
            {new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl font-black ${pslColor(scan.overallPslScore)}`}>
              {scan.overallPslScore.toFixed(1)}
            </span>
            <div>
              <p className="text-[#555] text-xs">PSL Score</p>
              <p className="text-fuchsia-400 text-sm font-semibold">→ {scan.potentialPslScore.toFixed(1)} potential</p>
            </div>
          </div>
          {scan.details?.faceShape && (
            <p className="mt-2 text-sm text-[#666]">
              Face shape: <span className="text-[#aaa] capitalize font-semibold">{scan.details.faceShape}</span>
            </p>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {/* Bone Structure */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            {ICONS.bone}
            <h3 className="text-xs font-bold uppercase tracking-widest">Bone Structure</h3>
          </div>
          <MetricRow label="Gonial Angle" value={scan.gonialAngleScore} tooltip={TOOLTIPS.gonialAngle} subpoints={scan.categoryAnalysis?.gonialAngle} />
          <MetricRow label="Midface Ratio" value={scan.midfaceRatioScore} tooltip={TOOLTIPS.midfaceRatio} subpoints={scan.categoryAnalysis?.midfaceRatio} />
          <MetricRow label="Cheekbone Prominence" value={scan.cheekboneScore} tooltip={TOOLTIPS.cheekbone} subpoints={scan.categoryAnalysis?.cheekbone} />
          <Recommendation text={scan.recommendations.boneStructure} />
        </div>

        {/* Eye Area */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            {ICONS.eye}
            <h3 className="text-xs font-bold uppercase tracking-widest">Eye Area</h3>
          </div>
          <MetricRow label="Canthal Tilt" value={scan.canthalTiltScore} tooltip={TOOLTIPS.canthalTilt} subpoints={scan.categoryAnalysis?.canthalTilt} />
          <MetricRow label="Upper Eyelid Exposure" value={scan.upperEyelidScore} tooltip={TOOLTIPS.upperEyelid} subpoints={scan.categoryAnalysis?.upperEyelid} />
          <MetricRow label="Interpupillary Distance" value={scan.ipdScore} tooltip={TOOLTIPS.ipd} subpoints={scan.categoryAnalysis?.ipd} />
          <Recommendation text={scan.recommendations.eyeArea} />
        </div>

        {/* Skin & Hair */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            {ICONS.skin}
            <h3 className="text-xs font-bold uppercase tracking-widest">Skin & Hair</h3>
          </div>
          <MetricRow label="Skin Clarity" value={scan.skinClarityScore} tooltip={TOOLTIPS.skinClarity} subpoints={scan.categoryAnalysis?.skinClarity} />
          <MetricRow label="Hairline" value={scan.hairlineScore} tooltip={TOOLTIPS.hairline} subpoints={scan.categoryAnalysis?.hairline} />
          <Recommendation text={scan.recommendations.skinAndHair} />
        </div>

        {/* Symmetry */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            {ICONS.symmetry}
            <h3 className="text-xs font-bold uppercase tracking-widest">Symmetry</h3>
          </div>
          <MetricRow label="Asymmetry Index" value={scan.symmetryScore} tooltip={TOOLTIPS.symmetry} subpoints={scan.categoryAnalysis?.symmetry} />
          <Recommendation text={scan.recommendations.symmetry} />
        </div>
      </div>
    </div>
  )
}
