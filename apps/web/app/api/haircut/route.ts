import { NextResponse } from 'next/server'
import { createFalClient } from '@fal-ai/client'
import { getSessionUser } from '@/lib/firebase/server'
import { getCredits, deductCredits } from '@/lib/firebase/credits'

export const maxDuration = 120

const HAIRCUT_COST = 3

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balance = await getCredits(user.id)
  if (balance.total_credits < HAIRCUT_COST) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })
  }

  const form = await request.formData()
  const image = form.get('image')
  const hairstyle = form.get('hairstyle')
  const faceShape = form.get('faceShape')

  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: 'image file required' }, { status: 400 })
  }
  if (typeof hairstyle !== 'string' || !hairstyle) {
    return NextResponse.json({ error: 'hairstyle name required' }, { status: 400 })
  }

  const prompt = `Change this person's hairstyle to ${hairstyle}${faceShape ? `, which suits a ${faceShape} face shape` : ''}. Keep the face, skin tone, facial features and expression identical. Only change the hair. Photorealistic, high quality portrait.`

  const fal = createFalClient({ credentials: process.env.FAL_API_KEY! })

  // Upload image to FAL storage first
  const imageFile = new File([image], 'photo.jpg', { type: image.type || 'image/jpeg' })
  const imageUrl = await fal.storage.upload(imageFile)

  // Run with Grok image edit model
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: [imageUrl],
      prompt,
    },
    logs: false,
  })

  const output = result.data as { images?: Array<{ url: string }>; image?: { url: string }; url?: string }
  const outputUrl = output?.images?.[0]?.url ?? output?.image?.url ?? output?.url

  if (!outputUrl) {
    console.error('[/api/haircut] Unexpected FAL output:', JSON.stringify(output))
    return NextResponse.json({ error: 'No image returned' }, { status: 500 })
  }

  await deductCredits(user.id, HAIRCUT_COST, 'haircut_tryon', `Haircut try-on: ${hairstyle}`)

  return NextResponse.json({ imageUrl: outputUrl })
}
