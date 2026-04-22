import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('ai_models')
    .select('id, name, credit_cost, provider, requires_image')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[/api/models] Supabase error:', error)
    return NextResponse.json({ error: error.message ?? error.code ?? 'Unknown error' }, { status: 500 })
  }

  return NextResponse.json(data)
}
