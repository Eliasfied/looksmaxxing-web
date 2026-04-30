import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET() {
  try {
    const snap = await adminDb
      .collection('ai_models')
      .where('is_active', '==', true)
      .orderBy('sort_order')
      .get()

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/models] Firestore error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
