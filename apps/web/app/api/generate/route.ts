import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { generateImage, InsufficientCreditsError } from '@/lib/fal'
import { getCredits } from '@/lib/firebase/credits'
import { buildExplorePrompt, tileKeyFromPath } from '@/lib/explore-prompt'
import { parseI2IUiOptions } from '@/lib/fal-i2i-input'

export const maxDuration = 120

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: Request) {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''

  let prompt: string
  let modelId: string
  let negativePrompt: string | undefined
  let sourceImage: Blob | undefined
  let sourceImage2: Blob | undefined
  let settings: Record<string, unknown> = {}
  let i2iOptions = undefined as ReturnType<typeof parseI2IUiOptions> | undefined
  let resolutionMultiplier = 1

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const mode = String(form.get('mode') ?? '')

    modelId = String(form.get('modelId') ?? '').trim()
    if (!modelId) {
      return badRequest('modelId is required')
    }

    const imageCount = Number(form.get('imageCount') ?? '1')
    if (imageCount > 1) {
      const img0 = form.get('image_0')
      if (!(img0 instanceof Blob) || img0.size === 0) return badRequest('Image file is required')
      sourceImage = img0
      const img1 = form.get('image_1')
      if (img1 instanceof Blob && img1.size > 0) sourceImage2 = img1
    } else {
      const img = form.get('image_0') ?? form.get('image')
      if (!(img instanceof Blob) || img.size === 0) return badRequest('Image file is required')
      sourceImage = img
    }

    try {
      const raw = form.get('i2iOptions')
      const parsed =
        typeof raw === 'string' && raw.trim() ? JSON.parse(raw) : {}
      i2iOptions = parseI2IUiOptions(parsed)
    } catch {
      i2iOptions = parseI2IUiOptions({})
    }

    const mult = parseFloat(String(form.get('resolutionMultiplier') ?? '1'))
    resolutionMultiplier = isFinite(mult) && mult > 0 ? mult : 1

    if (mode === 'explore') {
      const tilePath = String(form.get('tilePath') ?? '').trim()
      const categoryLabel = String(form.get('categoryLabel') ?? '').trim()
      if (!tilePath && !categoryLabel) {
        return badRequest('tilePath is required')
      }
      const tileKey = tilePath ? tileKeyFromPath(tilePath) : categoryLabel.toLowerCase().replace(/\s+/g, '_')
      const requiredCount = Number(String(form.get('requiredImages') ?? '1'))
      if (requiredCount === 2) {
        const img2 = form.get('image2')
        if (!(img2 instanceof Blob) || img2.size === 0) {
          return badRequest('Second image is required')
        }
        sourceImage2 = img2
      }
      prompt = buildExplorePrompt(tileKey)
    } else {
      const p = String(form.get('prompt') ?? '').trim()
      if (p.length < 3) {
        return badRequest('Prompt must be at least 3 characters')
      }
      if (p.length > 500) {
        return badRequest('Prompt must be 500 characters or fewer')
      }
      prompt = p
      const neg = form.get('negativePrompt')
      negativePrompt = typeof neg === 'string' && neg.trim() ? neg.trim() : undefined
    }
  } else {
    let body: {
      prompt?: unknown
      modelId?: unknown
      negativePrompt?: unknown
      settings?: unknown
      resolutionMultiplier?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON')
    }

    if (typeof body.prompt !== 'string' || body.prompt.trim().length < 3) {
      return badRequest('Prompt must be at least 3 characters')
    }
    if (body.prompt.length > 500) {
      return badRequest('Prompt must be 500 characters or fewer')
    }
    if (typeof body.modelId !== 'string' || !body.modelId) {
      return badRequest('modelId is required')
    }

    prompt = body.prompt.trim()
    modelId = body.modelId
    negativePrompt =
      typeof body.negativePrompt === 'string' && body.negativePrompt.trim()
        ? body.negativePrompt.trim()
        : undefined
    settings = (body.settings as Record<string, unknown>) ?? {}
    sourceImage = undefined
    sourceImage2 = undefined
    const mult = parseFloat(String(body.resolutionMultiplier ?? '1'))
    resolutionMultiplier = isFinite(mult) && mult > 0 ? mult : 1
  }

  try {
    const result = await generateImage({
      prompt,
      modelId,
      userId: user.id,
      negativePrompt,
      sourceImage,
      sourceImage2,
      i2iOptions,
      settings,
      resolutionMultiplier,
    })

    const remaining = await getCredits(user.id)

    return NextResponse.json({
      imageUrl: result.imageUrl,
      width: result.width,
      height: result.height,
      creditsUsed: result.creditsUsed,
      remainingCredits: remaining.total_credits,
    })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: err.message }, { status: 402 })
    }
    console.error('[/api/generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
