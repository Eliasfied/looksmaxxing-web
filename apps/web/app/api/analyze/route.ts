import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getCredits, deductCredits } from '@/lib/firebase/credits'
import { createFaceScan } from '@/lib/firebase/scans'

export const maxDuration = 120

const OPENAI_PROXY = 'https://openai-secure-proxy.vercel.app/api/chat'
const ANALYZE_COST = 1

const FACE_ANALYSIS_PROMPT = `You are a looksmaxxing face analysis AI. Analyze the face in the image and rate each metric objectively.

Evaluate the following facial metrics. Score each 0-100 (100=ideal).

BONE STRUCTURE:
- Gonial Angle: Jaw angle seen from profile. Sharp ~120° is ideal. Score higher for defined jaw.
- Midface Ratio: Compactness of the midface. Shorter midface = more attractive. Score higher for compact midface.
- Cheekbone Prominence: How visible and defined the cheekbones are. Score higher for prominent cheekbones.

EYE AREA:
- Canthal Tilt: Angle of the eye corners. Positive (upward) tilt is attractive. Score higher for positive tilt.
- Upper Eyelid Exposure (UEE): Less upper eyelid visible = more attractive (hunter eyes). Score higher for low UEE.
- Interpupillary Distance (IPD): Distance between pupils. Average/proportional is ideal. Score based on harmony.

SKIN & HAIR:
- Skin Clarity: Texture, blemishes, tone evenness, glow. Score higher for clear, healthy skin.
- Hairline Depth: Norwood scale check. Full, low hairline = high score. Receding = lower score.

SYMMETRY:
- Asymmetry Index: How symmetric the two face halves are. More symmetric = higher score.

OVERALL:
- Overall PSL Score: 1-10 on the PSL attractiveness scale (be realistic; most people are 4-6). Use ONE decimal place (e.g. 5.3, 6.7, 7.1).
- Potential PSL Score: What this person could realistically achieve with looksmaxxing (current + 1 to 2 points, capped at 9.1). Use ONE decimal place.

Return ONLY valid JSON:
{
  "confidence": 0.85,
  "overallPslScore": 5.3,
  "potentialPslScore": 6.8,
  "skinType": "combination",
  "gonialAngleScore": 65,
  "midfaceRatioScore": 70,
  "cheekboneScore": 55,
  "canthalTiltScore": 60,
  "upperEyelidScore": 50,
  "ipdScore": 70,
  "skinClarityScore": 75,
  "hairlineScore": 80,
  "symmetryScore": 72,
  "categoryAnalysis": {
    "gonialAngle": ["Jaw angle is slightly obtuse", "Could benefit from mewing", "Moderate definition"],
    "midfaceRatio": ["Midface is proportional", "Good eye-to-mouth distance", "Balanced facial thirds"],
    "cheekbone": ["Cheekbones have moderate projection", "Could benefit from lower body fat", "Decent zygomatic arch"],
    "canthalTilt": ["Slight positive canthal tilt", "Eye area is harmonious", "No significant droop"],
    "upperEyelid": ["Moderate upper eyelid exposure", "Not quite hunter eyes", "Could improve with eyebrow positioning"],
    "ipd": ["Proportional interpupillary distance", "Eyes are well-spaced", "Harmonious with face width"],
    "skinClarity": ["Clear skin with minor blemishes", "Even skin tone", "Good texture overall"],
    "hairline": ["Full hairline with no recession", "Good density", "Norwood 1-2 range"],
    "symmetry": ["Good overall symmetry", "Minor asymmetry in jawline", "Eyes are well-aligned"]
  },
  "recommendations": {
    "boneStructure": "Practice proper tongue posture (mewing) and consider jaw exercises to define the jawline.",
    "eyeArea": "Focus on sleep quality to reduce puffiness. Cold compresses can help.",
    "skinAndHair": "Follow a consistent AM/PM skincare routine with SPF. Use retinol at night.",
    "symmetry": "Sleep on your back to avoid facial asymmetry. Chew evenly on both sides.",
    "style": "Choose hairstyles that complement your face shape.",
    "lifestyle": "Maintain low body fat (12-15%) to maximize facial definition. Stay hydrated and get 7-9h sleep."
  },
  "details": {
    "faceShape": "oval",
    "strongestFeature": "eye area",
    "mainImprovement": "jawline definition"
  }
}

RULES:
- Be HONEST and realistic. Most people score 4-6 PSL. Do NOT inflate scores.
- Use ANY integer 0-100 for sub-scores.
- For overallPslScore and potentialPslScore, use ONE decimal place (e.g. 5.3, 6.7, 7.1).
- Provide 3 specific observations per category in categoryAnalysis.
- Provide actionable, specific recommendations.
- If this is clearly not a face photo, set confidence very low and note it in details.`

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balance = await getCredits(user.id)
  if (balance.total_credits < ANALYZE_COST) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  let imageBase64: string
  try {
    const body = await request.json()
    if (typeof body.imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })
    }
    imageBase64 = body.imageBase64
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const imageUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`

  const openaiRes = await fetch(OPENAI_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: FACE_ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    }),
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    console.error('[/api/analyze] OpenAI proxy error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }

  const openaiData = await openaiRes.json()
  const rawContent: string = openaiData.choices?.[0]?.message?.content ?? ''

  let analysisData: Record<string, unknown>
  try {
    let json = rawContent
    const jsonFence = json.indexOf('```json')
    const genericFence = json.indexOf('```')
    if (jsonFence !== -1) {
      const start = jsonFence + 7
      const end = json.indexOf('```', start)
      json = end > start ? json.slice(start, end).trim() : json
    } else if (genericFence !== -1) {
      const start = genericFence + 3
      const end = json.indexOf('```', start)
      json = end > start ? json.slice(start, end).trim() : json
    }
    analysisData = JSON.parse(json)
  } catch {
    console.error('[/api/analyze] Failed to parse AI response:', rawContent)
    return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 })
  }

  await deductCredits(user.id, ANALYZE_COST, 'face_analysis', 'Face Analysis')

  const scan = await createFaceScan({
    userId: user.id,
    overallPslScore: Number(analysisData.overallPslScore) || 5.0,
    potentialPslScore: Number(analysisData.potentialPslScore) || 6.0,
    gonialAngleScore: Number(analysisData.gonialAngleScore) || 50,
    midfaceRatioScore: Number(analysisData.midfaceRatioScore) || 50,
    cheekboneScore: Number(analysisData.cheekboneScore) || 50,
    canthalTiltScore: Number(analysisData.canthalTiltScore) || 50,
    upperEyelidScore: Number(analysisData.upperEyelidScore) || 50,
    ipdScore: Number(analysisData.ipdScore) || 50,
    skinClarityScore: Number(analysisData.skinClarityScore) || 50,
    hairlineScore: Number(analysisData.hairlineScore) || 50,
    symmetryScore: Number(analysisData.symmetryScore) || 50,
    skinType: (analysisData.skinType as string) || undefined,
    confidence: Number(analysisData.confidence) || 0.8,
    categoryAnalysis: (analysisData.categoryAnalysis as Record<string, string[]>) || {},
    recommendations: (analysisData.recommendations as Record<string, string>) || {},
    details: (analysisData.details as Record<string, string>) || {},
  })

  return NextResponse.json({ scan })
}
