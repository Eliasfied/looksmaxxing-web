import { NextResponse } from 'next/server'
import { createFalClient } from '@fal-ai/client'
import { getSessionUser } from '@/lib/firebase/server'
import { getCredits, deductCredits } from '@/lib/firebase/credits'
import { getPlan } from '@/lib/entitlement'
import { appConfig } from '@/lib/config'
import { FACE_SHAPES, findTryOn, tryOnPrompt, type FaceShape } from '@/lib/tryon-catalog'

export const maxDuration = 120

const COST = appConfig.credits.tryOn

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getPlan(user.id)).pro)
    return NextResponse.json({ error: 'Aura Pro required', upgrade: true }, { status: 402 })

  const balance = await getCredits(user.id)
  if (balance.total_credits < COST)
    return NextResponse.json(
      { error: 'Your try-ons for this month are used up. They refill on your next billing date.' },
      { status: 429 }
    )

  if (!(request.headers.get('content-type') ?? '').includes('multipart/form-data'))
    return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })

  const form = await request.formData()
  const image = form.get('image')
  const match = findTryOn(String(form.get('type') ?? ''), String(form.get('option') ?? ''))
  const shapeValue = String(form.get('faceShape') ?? '')
  const faceShape = FACE_SHAPES.find((s) => s === shapeValue) as FaceShape | undefined

  if (!(image instanceof Blob) || image.size === 0 || image.size > 10_000_000)
    return NextResponse.json({ error: 'Upload a photo smaller than 10 MB.' }, { status: 400 })
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type))
    return NextResponse.json({ error: 'Use a JPG, PNG or WebP photo.' }, { status: 400 })
  if (!match) return NextResponse.json({ error: 'Unknown style' }, { status: 400 })

  const fal = createFalClient({ credentials: process.env.FAL_API_KEY! })
  const imageUrl = await fal.storage.upload(new File([image], 'photo.jpg', { type: image.type }))
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: [imageUrl],
      prompt: tryOnPrompt(match.category.type, match.option.label, faceShape)
    },
    logs: false
  })

  const output = result.data as { images?: Array<{ url: string }>; image?: { url: string }; url?: string }
  const outputUrl = output?.images?.[0]?.url ?? output?.image?.url ?? output?.url
  if (!outputUrl) {
    console.error('[/api/tryon] Unexpected FAL output')
    return NextResponse.json({ error: 'No image returned. Please try again.' }, { status: 502 })
  }

  const deducted = await deductCredits(
    user.id,
    COST,
    `tryon:${match.category.type}:${match.option.id}`,
    `Try-on: ${match.category.label} – ${match.option.label}`
  )
  return NextResponse.json({
    imageUrl: outputUrl,
    remaining: Math.floor(deducted.remaining / COST)
  })
}
