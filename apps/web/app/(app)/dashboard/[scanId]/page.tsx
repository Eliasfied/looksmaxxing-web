import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/firebase/server'
import { getScanById } from '@/lib/firebase/scans'
import type { FaceScan } from '@/lib/firebase/scans'

interface Props {
  params: Promise<{ scanId: string }>
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[#888]">{label}</span>
        <span className="text-white font-semibold">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function scoreColor(score: number) {
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6) return 'text-yellow-400'
  if (score >= 4.5) return 'text-orange-400'
  return 'text-red-400'
}

export default async function ScanDetailPage({ params }: Props) {
  const { scanId } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const scan: FaceScan | null = await getScanById(scanId)
  if (!scan || scan.userId !== user.id) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-[#555] hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
      </div>

      <div>
        <p className="text-xs text-[#555] mb-1">
          {new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="flex items-baseline gap-3">
          <span className={`text-6xl font-black ${scoreColor(scan.overallPslScore)}`}>
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

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Bone Structure</h3>
          <MetricRow label="Gonial Angle" value={scan.gonialAngleScore} />
          <MetricRow label="Midface Ratio" value={scan.midfaceRatioScore} />
          <MetricRow label="Cheekbone Prominence" value={scan.cheekboneScore} />
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Eye Area</h3>
          <MetricRow label="Canthal Tilt" value={scan.canthalTiltScore} />
          <MetricRow label="Upper Eyelid Exposure" value={scan.upperEyelidScore} />
          <MetricRow label="Interpupillary Distance" value={scan.ipdScore} />
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Skin & Hair</h3>
          <MetricRow label="Skin Clarity" value={scan.skinClarityScore} />
          <MetricRow label="Hairline" value={scan.hairlineScore} />
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Symmetry</h3>
          <MetricRow label="Asymmetry Index" value={scan.symmetryScore} />
        </div>

        {Object.keys(scan.recommendations).length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Glow-Up Plan</h3>
            <div className="space-y-3">
              {Object.entries(scan.recommendations).map(([key, value]) =>
                value ? (
                  <div key={key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-xs font-bold text-[#666] uppercase tracking-wide mb-1.5 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-sm text-[#aaa] leading-relaxed">{value}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
