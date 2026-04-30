import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { adminDb } from '@/lib/firebase/admin'
import { createFalClient } from '@fal-ai/client'
import { getCredits, deductCredits } from '@/lib/firebase/credits'
import { buildI2IInput, defaultI2IOptions } from '@/lib/fal-i2i-input'

// TODO: Replace packsData with your own packs JSON or data source
const packsData: Array<{ slug: string; h1: string; [key: string]: unknown }> = []

export const maxDuration = 120

const PACK_IMAGE_COUNT = 6

function createFal() {
  return createFalClient({ credentials: process.env.FAL_API_KEY! })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const packSlug = String(form.get('packSlug') ?? '').trim()
  const modelId  = String(form.get('modelId') ?? '').trim()
  const gender   = String(form.get('gender') ?? 'female').trim() as 'male' | 'female'
  const imageFile = form.get('image')

  if (!packSlug) return NextResponse.json({ error: 'packSlug is required' }, { status: 400 })
  if (!modelId)  return NextResponse.json({ error: 'modelId is required' }, { status: 400 })
  if (!(imageFile instanceof Blob) || imageFile.size === 0) {
    return NextResponse.json({ error: 'Image is required' }, { status: 400 })
  }

  const pack = packsData.find(p => p.slug === packSlug)
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  const packAny = pack as Record<string, unknown>
  const prompts: string[] = (
    gender === 'male'
      ? (packAny.prompts_male as string[] | undefined)
      : (packAny.prompts_female as string[] | undefined)
  ) ?? (packAny.prompts as string[] | undefined) ?? []

  if (prompts.length === 0) {
    return NextResponse.json({ error: 'No prompts configured for this pack' }, { status: 500 })
  }

  const modelSnap = await adminDb.collection('ai_models').doc(modelId).get()
  if (!modelSnap.exists || !modelSnap.data()!.is_active) {
    return NextResponse.json({ error: 'Model not found' }, { status: 400 })
  }
  const model = modelSnap.data()!

  const totalCost = model.credit_cost * PACK_IMAGE_COUNT

  const balance = await getCredits(user.id)
  if (balance.total_credits < totalCost) {
    return NextResponse.json(
      { error: `Insufficient credits: ${balance.total_credits} available, ${totalCost} required for this pack` },
      { status: 402 }
    )
  }

  const fal = createFal()
  const imageUrl = await fal.storage.upload(imageFile)

  const i2iEndpoint = `${model.fal_model_id}/edit`
  const i2iOptions = defaultI2IOptions()

  const results = await Promise.allSettled(
    prompts.map((prompt) => {
      const input = buildI2IInput(i2iEndpoint, prompt, [imageUrl], i2iOptions)
      return fal.subscribe(i2iEndpoint as never, { input: input as never, logs: false })
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled')
  if (succeeded.length === 0) {
    return NextResponse.json({ error: 'All generations failed. No credits deducted.' }, { status: 500 })
  }

  const actualCost = model.credit_cost * succeeded.length
  await deductCredits(
    user.id,
    actualCost,
    `pack:${packSlug}:${modelId}`,
    `Photo Pack: ${pack.h1} (${succeeded.length} images via ${model.name})`
  )

  const remaining = await getCredits(user.id)

  interface FalImage { url: string; width?: number; height?: number }
  interface FalOutput { images?: FalImage[]; image?: FalImage }

  const images = results.map((r) => {
    if (r.status === 'rejected') return null
    const output = (r.value as { data: FalOutput }).data
    const img = output?.images?.[0] ?? output?.image
    return img ? { url: img.url, width: img.width ?? 1024, height: img.height ?? 1024 } : null
  })

  return NextResponse.json({
    images,
    creditsUsed: actualCost,
    remainingCredits: remaining.total_credits,
  })
}
