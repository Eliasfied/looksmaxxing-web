import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getCredits } from '@/lib/firebase/credits'

export async function GET() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const balance = await getCredits(user.id)
  return NextResponse.json(balance)
}
