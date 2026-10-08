import { NextResponse } from 'next/server'
import { findTool, isPhotoData, previewReport } from '@/lib/tool-report'
import { analyzeTool } from '@/lib/tool-analysis'
import { guestToken, reservePreview, sameOrigin, saveToolReport } from '@/lib/tool-store'

export const maxDuration = 120
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  if (Number(request.headers.get('content-length') ?? 0) > 8_500_000)
    return NextResponse.json({ error: 'Please use smaller images.' }, { status: 413 })
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
    if (
      !tool ||
      !isPhotoData(body.image) ||
      body.consent !== true ||
      body.adult !== true ||
      body.website
    )
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
      /^\/(?:|pricing|tools|(?:blog|glossary|tools)\/[a-z0-9-]+)$/.test(body.source)
        ? body.source
        : '/tools'
    const token = await guestToken()
    await reservePreview(request, token)
    const report = await analyzeTool(
      tool,
      tool.requiresComparison ? [body.image, body.comparisonImage] : [body.image],
      preferences
    )
    const id = await saveToolReport(tool.slug, report, token, source, tool.audience)
    return NextResponse.json(previewReport(id, tool.slug, report), {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis could not be completed.'
    const rateLimited = message.includes('limit reached')
    const photoError = message.includes('clear photo')
    const unconfigured = message.includes('not configured')
    return NextResponse.json(
      {
        error:
          rateLimited || photoError || unconfigured
            ? message
            : 'Analysis could not be completed. Please try again.'
      },
      { status: rateLimited ? 429 : photoError ? 422 : unconfigured ? 503 : 500 }
    )
  }
}
