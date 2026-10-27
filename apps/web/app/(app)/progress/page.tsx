import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getUserScans, type FaceScan } from '@/lib/firebase/scans'
import { getPlan } from '@/lib/entitlement'
import { ScoreChart } from '@/components/score-chart'
import { ScanUploader } from '@/components/scan-uploader'
import { UpgradeNudge } from '@/components/pro-paywall'

const METRICS: Array<[keyof FaceScan, string]> = [
  ['skinClarityScore', 'Skin clarity'],
  ['hairlineScore', 'Hairline'],
  ['symmetryScore', 'Symmetry'],
  ['gonialAngleScore', 'Jaw definition'],
  ['cheekboneScore', 'Cheekbones'],
  ['canthalTiltScore', 'Canthal tilt'],
  ['upperEyelidScore', 'Eye area'],
  ['midfaceRatioScore', 'Midface'],
  ['ipdScore', 'Eye spacing']
]

export default async function ProgressPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/progress')
  const [scans, plan] = await Promise.all([getUserScans(user.id), getPlan(user.id)])
  const ordered = [...scans].reverse()
  const first = ordered[0],
    latest = ordered[ordered.length - 1]
  const compare = plan.pro && first && latest && first !== latest

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Progress</p>
          <h1 className="mt-2 text-4xl font-black">Is it working?</h1>
          <p className="mt-2 max-w-xl text-white/60">
            Check in once a month with the same light, angle and expression. Only then are scans comparable.
          </p>
        </div>
        {plan.pro && <ScanUploader label="Check in now" />}
      </header>

      {!plan.pro && <UpgradeNudge text="Progress tracking and monthly check-ins are part of Aura Pro." />}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">PSL score over time</h2>
        <div className="mt-4">
          <ScoreChart points={ordered.map((s) => ({ date: s.createdAt, value: s.overallPslScore }))} height={180} />
        </div>
      </section>

      {compare && (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-black">
            First scan vs. latest
            <span className="ml-2 text-sm font-normal text-white/45">
              {new Date(first.createdAt).toLocaleDateString('en-US')} → {new Date(latest.createdAt).toLocaleDateString('en-US')}
            </span>
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {METRICS.map(([key, label]) => {
              const before = Number(first[key]) || 0,
                after = Number(latest[key]) || 0,
                d = after - before
              return (
                <li key={key} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <p className="text-xs text-white/50">{label}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black tabular-nums">{after}</span>
                    <span className={`text-sm font-bold ${d > 0 ? 'text-emerald-300' : d < 0 ? 'text-amber-300' : 'text-white/40'}`}>
                      {d > 0 ? '+' : ''}
                      {d}
                    </span>
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-white/40">
            Scores are AI estimates from single photos. Small swings usually come from light and angle, not from change.
          </p>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 p-6">
        <div>
          <h2 className="font-black">Side-by-side photo comparison</h2>
          <p className="text-sm text-white/60">Upload a before and an after photo and get an honest look at what changed.</p>
        </div>
        <Link href="/tools/mewing-tracker?source=/dashboard" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">
          Compare two photos
        </Link>
      </section>
    </div>
  )
}
