import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { accessReport, sameOrigin } from '@/lib/tool-store'
import { findTool } from '@/lib/tool-report'
import { getStoredPlan, planFromReport, savePlan, summarizePlan, toggleTask } from '@/lib/routines'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const plan = await getStoredPlan(user.id)
  return NextResponse.json({ plan, summary: plan ? summarizePlan(plan) : null }, { headers: { 'Cache-Control': 'no-store' } })
}

// Turn an unlocked report the user owns into their active plan.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getPlan(user.id)).pro)
    return NextResponse.json({ error: 'Plans are part of Aura Pro.', upgrade: true }, { status: 402 })
  const { reportId } = await request.json().catch(() => ({}))
  if (typeof reportId !== 'string') return NextResponse.json({ error: 'reportId required' }, { status: 400 })
  const access = await accessReport(reportId)
  if (!access?.owner || !access.unlocked || access.user?.id !== user.id)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  try {
    const tool = findTool(access.payload.tool)
    const plan = planFromReport(access.payload.report, access.payload.tool, tool?.name ?? 'My plan', reportId)
    await savePlan(user.id, plan)
    return NextResponse.json({ summary: summarizePlan(plan) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save plan' }, { status: 422 })
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, done } = await request.json().catch(() => ({}))
  if (typeof key !== 'string' || !/^\d{1,2}-\d{1,2}$/.test(key) || typeof done !== 'boolean')
    return NextResponse.json({ error: 'Invalid task' }, { status: 400 })
  try {
    return NextResponse.json({ summary: await toggleTask(user.id, key, done) })
  } catch {
    return NextResponse.json({ error: 'Unknown task' }, { status: 404 })
  }
}
