import { NextResponse } from 'next/server'
import { accessReport, claimReport, sameOrigin, unlockToolReport } from '@/lib/tool-store'
import { previewReport } from '@/lib/tool-report'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const access = await accessReport(id)
  if (!access)
    return NextResponse.json({ error: 'Report unavailable or preview expired.' }, { status: 404 })
  const preview = previewReport(id, access.payload.tool, access.payload.report)
  return NextResponse.json(
    access.unlocked ? { ...preview, unlocked: true, report: access.payload.report } : preview,
    { headers: { 'Cache-Control': 'no-store, private' } }
  )
}
export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const { id } = await params
  try {
    const { action } = await request.json()
    if (action === 'claim') await claimReport(id)
    else if (action === 'unlock') await unlockToolReport(id)
    else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const payment = error instanceof Error && error.message === 'PAYMENT_REQUIRED'
    return NextResponse.json(
      { error: payment ? 'Waiting for payment or credits.' : 'Unable to access this report.' },
      { status: payment ? 402 : 403 }
    )
  }
}
