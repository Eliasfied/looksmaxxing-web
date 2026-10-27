import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, ListChecks, MessageCircle, ScanFace, Wand2, LineChart } from 'lucide-react'
import { getSessionUser } from '@/lib/firebase/server'
import { getUserScans, redactLockedScan } from '@/lib/firebase/scans'
import { listToolReports } from '@/lib/tool-store'
import { getPlan } from '@/lib/entitlement'
import { getActivePlan } from '@/lib/routines'
import { getCredits } from '@/lib/firebase/credits'
import { appConfig } from '@/lib/config'
import { ScanUploader } from '@/components/scan-uploader'
import { ScoreChart } from '@/components/score-chart'
import { ProPaywall } from '@/components/pro-paywall'
import { ResultsClient } from './results-client'

const RESCAN_DAYS = 30

function daysAgo(iso: string) {
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
}

function Tile({
  href,
  icon: Icon,
  title,
  children,
  className = ''
}: {
  href: string
  icon: typeof ScanFace
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-0.5 hover:border-fuchsia-400/40 hover:bg-white/[0.05] ${className}`}
    >
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-white/80">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-violet-500/25">
            <Icon className="h-4 w-4 text-fuchsia-100" aria-hidden />
          </span>
          {title}
        </span>
        <ArrowUpRight className="h-4 w-4 text-white/30 transition group-hover:text-white" aria-hidden />
      </span>
      <span className="mt-4 flex-1">{children}</span>
    </Link>
  )
}

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [scans, reports, plan, activePlan, balance] = await Promise.all([
    getUserScans(user.id),
    listToolReports(user.id),
    getPlan(user.id),
    getActivePlan(user.id),
    getCredits(user.id)
  ])
  const latest = scans[0]
  const first = scans[scans.length - 1]
  const history = [...scans].reverse().map((s) => ({ date: s.createdAt, value: s.overallPslScore }))
  const delta = latest && first && latest !== first ? latest.overallPslScore - first.overallPslScore : null
  const daysSince = latest ? daysAgo(latest.createdAt) : null
  const rescanDue = daysSince === null || daysSince >= RESCAN_DAYS
  const tryOnsLeft = Math.floor(balance.total_credits / appConfig.credits.tryOn)
  const planPct = activePlan && activePlan.total ? Math.round((activePlan.done / activePlan.total) * 100) : 0

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0b14] p-7 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-60 w-60 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
              {plan.pro ? 'Aura Pro' : 'Your glow-up'}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              {latest ? 'Your glow-up, at a glance.' : 'Let’s find your starting point.'}
            </h1>
            <p className="mt-3 max-w-xl text-white/60">
              {!latest
                ? 'Start with a face scan. Everything else, your plan, try-ons and coach, builds on it.'
                : rescanDue
                  ? `Your last scan was ${daysSince} days ago. Time for a check-in to see what changed.`
                  : `Next check-in in ${RESCAN_DAYS - (daysSince ?? 0)} days. Keep following your plan until then.`}
            </p>
            <div className="mt-6">
              {plan.pro ? (
                <ScanUploader label={latest ? (rescanDue ? 'Do my monthly check-in' : 'New face scan') : 'Start my face scan'} />
              ) : (
                <Link href="/tools/ai-face-rating" className="btn-gradient inline-flex rounded-full px-6 py-3 text-sm font-bold text-white">
                  Try the free face preview
                </Link>
              )}
            </div>
          </div>
          {latest && (
            <div className="flex items-end gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">PSL score</p>
                <p className="text-6xl font-black tabular-nums">{latest.overallPslScore.toFixed(1)}</p>
              </div>
              <div className="pb-2">
                <p className="text-xs uppercase tracking-wider text-white/45">Potential</p>
                <p className="text-2xl font-black text-fuchsia-300 tabular-nums">{latest.potentialPslScore.toFixed(1)}</p>
                {delta !== null && (
                  <p className={`mt-1 text-sm font-bold ${delta >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(1)} since your first scan
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {!plan.pro && (
        <ProPaywall
          signedIn
          returnTo="/dashboard"
          placement="dashboard"
          headline="Get the full glow-up with Aura Pro"
          subline="Your scans, all 11 analyses, the try-on studio, a daily plan and a coach who knows your face."
        />
      )}

      <section className="grid gap-4 md:grid-cols-6">
        <Tile href="/progress" icon={LineChart} title="Progress" className="md:col-span-4">
          <ScoreChart points={history} />
        </Tile>
        <Tile href="/plan" icon={ListChecks} title="My plan" className="md:col-span-2">
          {activePlan ? (
            <>
              <span className="block text-3xl font-black">{planPct}%</span>
              <span className="mt-1 block text-sm text-white/55">
                {activePlan.done} of {activePlan.total} tasks · {activePlan.title}
              </span>
              <span className="mt-4 block h-2 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" style={{ width: `${planPct}%` }} />
              </span>
              {activePlan.open[0] && <span className="mt-4 block text-sm text-white/70">Next: {activePlan.open[0]}</span>}
            </>
          ) : (
            <span className="text-sm text-white/55">Turn a report into a daily checklist your coach follows.</span>
          )}
        </Tile>
        <Tile href="/studio" icon={Wand2} title="Try-on studio" className="md:col-span-2">
          <span className="block text-3xl font-black">{plan.pro ? tryOnsLeft : 'Pro'}</span>
          <span className="mt-1 block text-sm text-white/55">
            {plan.pro ? 'looks left this month' : 'Haircuts, color, beard, glasses, bald preview'}
          </span>
        </Tile>
        <Tile href="/tools" icon={ScanFace} title="Analyses" className="md:col-span-2">
          <span className="block text-3xl font-black">{reports.length}</span>
          <span className="mt-1 block text-sm text-white/55">reports so far · 11 analyses available</span>
        </Tile>
        <Tile href="/chat" icon={MessageCircle} title="AI coach" className="md:col-span-2">
          <span className="block text-sm text-white/70">
            {latest ? 'Ask what to change first. Your coach knows your scan and your plan.' : 'Ask anything about grooming, hair, skin and style.'}
          </span>
        </Tile>
      </section>

      {reports.length > 0 && (
        <section>
          <h2 className="text-xl font-black">Your reports</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/tools/result/${report.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-fuchsia-400/40"
                >
                  <span className="font-semibold">{report.name}</span>
                  <span className="mt-1 block text-sm text-white/50">
                    {report.unlocked ? 'Open report' : 'Unlock with Pro'} · {new Date(report.createdAt).toLocaleDateString('en-US')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ResultsClient initialScans={scans.map((s) => redactLockedScan(s, plan.pro))} />
    </div>
  )
}
