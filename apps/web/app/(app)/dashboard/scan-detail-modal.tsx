'use client'

import type { FaceScan } from '@/lib/firebase/scans'

interface Props {
  scan: FaceScan
  onClose: () => void
}

function MetricRow({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[#888]">{label}</span>
        <span className="text-white font-semibold">{value}{max === 100 ? '/100' : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ScanDetailModal({ scan, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <p className="text-xs text-[#555] mb-1">
            {new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black text-white">{scan.overallPslScore.toFixed(1)}</span>
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

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Bone Structure</h3>
            <div className="space-y-3">
              <MetricRow label="Gonial Angle" value={scan.gonialAngleScore} />
              <MetricRow label="Midface Ratio" value={scan.midfaceRatioScore} />
              <MetricRow label="Cheekbone Prominence" value={scan.cheekboneScore} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Eye Area</h3>
            <div className="space-y-3">
              <MetricRow label="Canthal Tilt" value={scan.canthalTiltScore} />
              <MetricRow label="Upper Eyelid Exposure" value={scan.upperEyelidScore} />
              <MetricRow label="Interpupillary Distance" value={scan.ipdScore} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Skin & Hair</h3>
            <div className="space-y-3">
              <MetricRow label="Skin Clarity" value={scan.skinClarityScore} />
              <MetricRow label="Hairline" value={scan.hairlineScore} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Symmetry</h3>
            <MetricRow label="Asymmetry Index" value={scan.symmetryScore} />
          </div>

          {Object.keys(scan.recommendations).length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Glow-Up Plan</h3>
              <div className="space-y-3">
                {Object.entries(scan.recommendations).map(([key, value]) => (
                  value ? (
                    <div key={key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <p className="text-xs font-bold text-[#666] uppercase tracking-wide mb-1.5 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-[#aaa] leading-relaxed">{value}</p>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
