import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getUserScans, redactLockedScan } from '@/lib/firebase/scans'
import { ResultsClient } from './results-client'
import Link from 'next/link'
import { listToolReports } from '@/lib/tool-store'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [scans, reports] = await Promise.all([getUserScans(user.id), listToolReports(user.id)])

  return <><section className="mx-auto max-w-5xl px-4 py-8"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Your tool reports</h1><Link href="/tools" className="text-sm text-fuchsia-300">Explore tools →</Link></div>{reports.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{reports.map(report => <li key={report.id}><Link href={`/tools/result/${report.id}`} className="block rounded-xl border border-white/10 p-4 hover:border-fuchsia-400/40"><span className="font-semibold">{report.name}</span><span className="mt-1 block text-sm text-white/50">{report.unlocked ? 'Open report' : 'Continue to unlock'} · {new Date(report.createdAt).toLocaleDateString('en-US')}</span></Link></li>)}</ul> : <p className="mt-4 text-sm text-white/60">Your saved previews and unlocked tool reports will appear here.</p>}</section><ResultsClient initialScans={scans.map(redactLockedScan)} /></>
}
