import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getLatestScan } from '@/lib/firebase/scans'

export const maxDuration = 60

const OPENAI_PROXY = 'https://openai-secure-proxy.vercel.app/api/chat'

function buildSystemMessage(scan: Awaited<ReturnType<typeof getLatestScan>>): string {
  const lines: string[] = [
    'You are a friendly looksmaxxing expert. The user has face analysis data from this app. Use it to personalize answers.',
    '',
    'CRITICAL: ONLY answer questions related to looksmaxxing, appearance, attractiveness, style, grooming, facial features, fitness for looks, and recommendations. If the user asks something unrelated, politely decline.',
    '',
  ]

  if (scan) {
    lines.push('USER FACE PROFILE (from latest scan):')
    lines.push(`- Overall PSL Score: ${scan.overallPslScore.toFixed(1)}/10`)
    lines.push(`- Potential PSL Score: ${scan.potentialPslScore.toFixed(1)}/10`)
    lines.push(`- Face Shape: ${scan.details?.faceShape ?? 'unknown'}`)
    lines.push(`- Gonial Angle: ${scan.gonialAngleScore}/100`)
    lines.push(`- Midface Ratio: ${scan.midfaceRatioScore}/100`)
    lines.push(`- Cheekbone Prominence: ${scan.cheekboneScore}/100`)
    lines.push(`- Canthal Tilt: ${scan.canthalTiltScore}/100`)
    lines.push(`- Upper Eyelid Exposure: ${scan.upperEyelidScore}/100`)
    lines.push(`- IPD: ${scan.ipdScore}/100`)
    lines.push(`- Skin Clarity: ${scan.skinClarityScore}/100`)
    lines.push(`- Hairline: ${scan.hairlineScore}/100`)
    lines.push(`- Symmetry: ${scan.symmetryScore}/100`)
    if (scan.details?.strongestFeature) {
      lines.push(`- Strongest feature: ${scan.details.strongestFeature}`)
    }
    if (scan.details?.mainImprovement) {
      lines.push(`- Main improvement area: ${scan.details.mainImprovement}`)
    }
    if (Object.keys(scan.categoryAnalysis).length > 0) {
      lines.push('Analysis insights:')
      for (const [key, observations] of Object.entries(scan.categoryAnalysis)) {
        if (observations.length > 0) {
          lines.push(`  ${key}: ${observations.join('; ')}`)
        }
      }
    }
    lines.push('')
  }

  lines.push('Be concise, actionable, and helpful. Reference their specific scores when giving advice.')
  return lines.join('\n')
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let messages: Array<{ role: string; content: string }>
  try {
    const body = await request.json()
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    messages = body.messages
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const latestScan = await getLatestScan(user.id)
  const systemMessage = buildSystemMessage(latestScan)

  const openaiRes = await fetch(OPENAI_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages,
      ],
      max_tokens: 600,
      temperature: 0.7,
    }),
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    console.error('[/api/chat] OpenAI proxy error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }

  const data = await openaiRes.json()
  const reply: string = data.choices?.[0]?.message?.content ?? ''

  return NextResponse.json({ reply })
}
