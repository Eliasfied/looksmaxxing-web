import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getCredits, deductCredits } from '@/lib/firebase/credits'

export const maxDuration = 120

const FAL_PROXY = 'https://fal-ai-secure-proxy-new.vercel.app/api/xai/grok-imagine-image/edit'
const HAIRCUT_COST = 1

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

  const prompt = `Change this person's hairstyle to: ${hairstyle}${faceShape ? ` (suits ${faceShape} face shape)` : ''}. Keep the person's face, skin tone, and facial features identical. Only change the hair. Photorealistic, high quality.`

  const outboundForm = new FormData()
  outboundForm.append('image', image, 'photo.jpg')
  outboundForm.append('prompt', prompt)
  outboundForm.append('strength', '0.85')

  const falRes = await fetch(FAL_PROXY, {
    method: 'POST',
    body: outboundForm,
  })

  if (!falRes.ok) {
    const err = await falRes.text()
    console.error('[/api/haircut] FAL proxy error:', err)
    return NextResponse.json({ error: 'Haircut generation failed' }, { status: 500 })
  }

  const falData = await falRes.json()
  const imageUrl: string =
    falData?.images?.[0]?.url ?? falData?.image?.url ?? falData?.output ?? ''

  if (!imageUrl) {
    return NextResponse.json({ error: 'No image returned from generation' }, { status: 500 })
  }

  await deductCredits(user.id, HAIRCUT_COST, 'haircut_tryon', `Haircut try-on: ${hairstyle}`)

  return NextResponse.json({ imageUrl })
}
