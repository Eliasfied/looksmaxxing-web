import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getScanById } from '@/lib/firebase/scans'
import { QuotaExceededError, reserveAnalysis } from '@/lib/entitlement'
import { aiModelOptions, aiProxyUrl, completedAIText } from '@/lib/ai-model'
import { sameOrigin } from '@/lib/tool-store'
import { buildPlanPrompt, parseIntake, planDay, sanitizePlan } from '@/lib/glow-plan'
import {
  getGlowState,
  releaseGeneration,
  reserveGeneration,
  saveGlowPlan,
  toggleGlowTask
} from '@/lib/glow-store'

export const maxDuration = 120

const noStore = { 'Cache-Control': 'no-store' }

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getGlowState(user.id), { headers: noStore })
}

// Builds (or rebuilds) the plan from the intake answers and the big scan.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  let intake
  try {
    intake = parseIntake(body?.intake)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
  const scan = typeof body?.scanId === 'string' ? await getScanById(body.scanId) : null
  if (!scan || scan.userId !== user.id) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  const reserved = await reserveGeneration(user.id)
  if (reserved === 'inactive')
    return NextResponse.json({ error: 'The 30-day plan is not active on this account.', upgrade: true }, { status: 402 })
  if (reserved === 'limit')
    return NextResponse.json({ error: 'You have rebuilt this plan the maximum number of times.' }, { status: 429 })

  try {
    await reserveAnalysis(user.id)
  } catch (error) {
    await releaseGeneration(user.id)
    if (error instanceof QuotaExceededError) return NextResponse.json({ error: error.message }, { status: 429 })
    throw error
  }

  try {
    const res = await fetch(aiProxyUrl('analysis'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(110_000),
      body: JSON.stringify({
        ...aiModelOptions('analysis', 9000, 0.4),
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: buildPlanPrompt(intake, scan as never) }]
      })
    })
    if (!res.ok) throw new Error(`Model proxy status ${res.status}`)
    const plan = sanitizePlan(JSON.parse(completedAIText(await res.json())))
    const current = await getGlowState(user.id)
    // Rebuilding in the first days restarts the 30 days; later it keeps them.
    const keepStart = Boolean(current.startedAt && planDay(current.startedAt) > 3)
    await saveGlowPlan(user.id, { intake, plan, scanId: scan.id, keepStart })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[/api/glow-plan] generation failed', error)
    await releaseGeneration(user.id)
    return NextResponse.json({ error: 'We could not build your plan. Please try again.' }, { status: 502 })
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, done } = await request.json().catch(() => ({}))
  if (typeof key !== 'string' || typeof done !== 'boolean')
    return NextResponse.json({ error: 'Invalid task' }, { status: 400 })
  try {
    return NextResponse.json({ done: await toggleGlowTask(user.id, key, done) })
  } catch {
    return NextResponse.json({ error: 'Unknown task' }, { status: 404 })
  }
}
