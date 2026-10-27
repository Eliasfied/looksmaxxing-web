'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { FaceScan } from '@/lib/firebase/scans'

interface Props {
  initialScans: FaceScan[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function PslBadge({ score }: { score: number }) {
  const color =
    score >= 7.5
      ? 'text-emerald-400'
      : score >= 6
        ? 'text-yellow-400'
        : score >= 4.5
          ? 'text-orange-400'
          : 'text-red-400'
  return (
    <span className={`text-2xl font-black tabular-nums ${color}`}>
      {score.toFixed(1)}
    </span>
  )
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#777]">{label}</span>
        <span className="text-[#aaa] font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ResultsClient({ initialScans }: Props) {
  const scans = initialScans

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Scan history
        </h2>
        <p className="text-[#666] text-sm mt-1">Every check-in, newest first</p>
      </div>

      {scans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/45">
          Your face scans will show up here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              href={`/dashboard/${scan.id}`}
              className="group text-left rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-purple-500/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-[#555] mb-1">
                    {formatDate(scan.createdAt)}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <PslBadge score={scan.overallPslScore} />
                    <span className="text-[#444] text-xs">/ 10 PSL</span>
                  </div>
                </div>
                <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 px-3 py-1.5">
                  <p className="text-[10px] text-[#666] mb-0.5">Potential</p>
                  <p className="text-sm font-bold text-fuchsia-400">
                    {scan.potentialPslScore.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="relative">
                <div
                  className={`space-y-2.5 ${scan.unlocked ? '' : 'blur-sm select-none'}`}
                >
                  <MetricBar
                    label="Bone Structure"
                    value={Math.round(
                      (scan.gonialAngleScore +
                        scan.midfaceRatioScore +
                        scan.cheekboneScore) /
                        3
                    )}
                  />
                  <MetricBar
                    label="Eye Area"
                    value={Math.round(
                      (scan.canthalTiltScore +
                        scan.upperEyelidScore +
                        scan.ipdScore) /
                        3
                    )}
                  />
                  <MetricBar
                    label="Skin & Hair"
                    value={Math.round(
                      (scan.skinClarityScore + scan.hairlineScore) / 2
                    )}
                  />
                  <MetricBar label="Symmetry" value={scan.symmetryScore} />
                </div>
                {!scan.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-black/80 px-3 py-1.5 text-xs font-bold text-white">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  </div>
                )}
              </div>

              {scan.details?.faceShape && (
                <p className="mt-4 text-xs text-[#555]">
                  Face shape:{' '}
                  <span className="text-[#888] capitalize">
                    {scan.details.faceShape}
                  </span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
