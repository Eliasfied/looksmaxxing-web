import { timingSafeEqual } from 'node:crypto'
import { adminDb } from '@/lib/firebase/admin'
import { cleanupExpiredTools } from '@/lib/tool-cleanup'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const actual = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret ?? ''}`)
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return Response.json({ deleted: await cleanupExpiredTools(adminDb) })
  } catch {
    console.error('Tool report cleanup failed')
    return Response.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
