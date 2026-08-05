import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { deductCredits } from '@/lib/firebase/credits'
import { getScanById, unlockScan } from '@/lib/firebase/scans'
import { appConfig } from '@/lib/config'

const UNLOCK_COST = appConfig.credits.unlockScan

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scanId } = await params
  const scan = await getScanById(scanId)
  if (!scan || scan.userId !== user.id) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }

  if (scan.unlocked) return NextResponse.json({ ok: true })

  const result = await deductCredits(user.id, UNLOCK_COST, `unlock:${scanId}`, 'Full analysis unlock')
  if (!result.success) {
    return NextResponse.json(
      { error: 'Insufficient credits', required: UNLOCK_COST, remaining: result.remaining },
      { status: 402 }
    )
  }

  await unlockScan(scanId)

  return NextResponse.json({ ok: true, remainingCredits: result.remaining })
}
