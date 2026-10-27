import { NextResponse } from 'next/server'
import { findTool, isPhotoData } from '@/lib/tool-report'
import { analyzeTool } from '@/lib/tool-analysis'
import { sameOrigin, saveOwnedToolReport } from '@/lib/tool-store'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan, QuotaExceededError, reserveAnalysis } from '@/lib/entitlement'

export const maxDuration = 120

// The AI report is a Pro feature. Visitors without Pro get the on-device
// preview in the browser, which costs nothing per upload.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  if (Number(request.headers.get('content-length') ?? 0) > 8_500_000)
    return NextResponse.json({ error: 'Please use smaller images.' }, { status: 413 })
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in to continue', upgrade: true }, { status: 401 })
  if (!(await getPlan(user.id)).pro)
    return NextResponse.json({ error: 'Aura Pro required', upgrade: true }, { status: 402 })
  try {
    const raw = await request.text()
    if (raw.length > 8_500_000)
      return NextResponse.json({ error: 'Please use smaller images.' }, { status: 413 })
    let body
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (!body || typeof body !== 'object')
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const tool = typeof body.tool === 'string' ? findTool(body.tool) : null
    if (!tool || !isPhotoData(body.image) || body.consent !== true || body.adult !== true)
      return NextResponse.json(
        { error: 'Choose a tool, upload a clear photo and confirm the photo permissions.' },
        { status: 400 }
      )
    if (tool.requiresComparison && !isPhotoData(body.comparisonImage))
      return NextResponse.json(
        { error: 'This comparison needs an earlier and a recent photo.' },
        { status: 400 }
      )
    const preferences = typeof body.preferences === 'string' ? body.preferences.slice(0, 500) : ''
    const source =
      typeof body.source === 'string' &&
      /^\/(?:|pricing|tools|dashboard|studio|(?:blog|glossary|tools)\/[a-z0-9-]+)$/.test(body.source)
        ? body.source
        : '/tools'
    await reserveAnalysis(user.id)
    const report = await analyzeTool(
      tool,
      tool.requiresComparison ? [body.image, body.comparisonImage] : [body.image],
      preferences
    )
    const id = await saveOwnedToolReport(user.id, tool.slug, report, source, tool.audience)
    return NextResponse.json({ id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof QuotaExceededError)
      return NextResponse.json({ error: error.message }, { status: 429 })
    const message = error instanceof Error ? error.message : 'Analysis could not be completed.'
    const photoError = message.includes('clear photo')
    const unconfigured = message.includes('not configured')
    return NextResponse.json(
      {
        error:
          photoError || unconfigured ? message : 'Analysis could not be completed. Please try again.'
      },
      { status: photoError ? 422 : unconfigured ? 503 : 500 }
    )
  }
}
