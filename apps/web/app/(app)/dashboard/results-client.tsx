'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { FaceScan } from '@/lib/firebase/scans'
import { UploadModal } from './upload-modal'

interface Props {
  initialScans: FaceScan[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
  return <span className={`text-2xl font-black tabular-nums ${color}`}>{score.toFixed(1)}</span>
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
  const [scans, setScans] = useState<FaceScan[]>(initialScans)
  const [showUpload, setShowUpload] = useState(false)

  function handleNewScan(scan: FaceScan) {
    setScans(prev => [scan, ...prev])
    setShowUpload(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Face Scans</h1>
        <p className="text-[#666] text-sm mt-1">Your looksmaxxing history</p>
        <button
          onClick={() => setShowUpload(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Scan
        </button>
      </div>

      {scans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] py-24 text-center">
          <div className="mb-4 text-5xl">📸</div>
          <h2 className="text-lg font-bold text-white mb-2">No scans yet</h2>
          <p className="text-[#555] text-sm mb-6">Upload a photo to get your PSL score and glow-up plan.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Start Face Scan
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scans.map(scan => (
            <Link
              key={scan.id}
              href={`/dashboard/${scan.id}`}
              className="group text-left rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-purple-500/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-[#555] mb-1">{formatDate(scan.createdAt)}</p>
                  <div className="flex items-baseline gap-1.5">
                    <PslBadge score={scan.overallPslScore} />
                    <span className="text-[#444] text-xs">/ 10 PSL</span>
                  </div>
                </div>
                <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 px-3 py-1.5">
                  <p className="text-[10px] text-[#666] mb-0.5">Potential</p>
                  <p className="text-sm font-bold text-fuchsia-400">{scan.potentialPslScore.toFixed(1)}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <MetricBar label="Bone Structure" value={Math.round((scan.gonialAngleScore + scan.midfaceRatioScore + scan.cheekboneScore) / 3)} />
                <MetricBar label="Eye Area" value={Math.round((scan.canthalTiltScore + scan.upperEyelidScore + scan.ipdScore) / 3)} />
                <MetricBar label="Skin & Hair" value={Math.round((scan.skinClarityScore + scan.hairlineScore) / 2)} />
                <MetricBar label="Symmetry" value={scan.symmetryScore} />
              </div>

              {scan.details?.faceShape && (
                <p className="mt-4 text-xs text-[#555]">
                  Face shape: <span className="text-[#888] capitalize">{scan.details.faceShape}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onScanComplete={handleNewScan} />
      )}
    </div>
  )
}
