import { createFalClient } from '@fal-ai/client'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import { getCredits, deductCredits } from '@/lib/supabase/credits'
import { buildI2IInput, defaultI2IOptions, type I2IUiOptions } from '@/lib/fal-i2i-input'

function createServiceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function createFal() {
  return createFalClient({
    credentials: process.env.FAL_API_KEY!,
  })
}

export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  modelId: string
  userId: string
  settings?: Record<string, unknown>
  sourceImage?: Blob
  sourceImage2?: Blob
  i2iOptions?: I2IUiOptions
  resolutionMultiplier?: number
}

export interface GenerateImageResult {
  imageUrl: string
  width: number
  height: number
  creditsUsed: number
}

interface FalImage {
  url: string
  width?: number
  height?: number
}

interface FalOutput {
  images?: FalImage[]
  image?: FalImage
}

export class InsufficientCreditsError extends Error {
  constructor(available: number, required: number) {
    super(`Insufficient credits: ${available} available, ${required} required`)
    this.name = 'InsufficientCreditsError'
  }
}

/**
 * Returns the I2I (image-to-image) fal endpoint for a given T2I model ID,
 * or null if the model has no I2I variant.
 * TODO: Update this list with your own supported fal.ai models.
 */
function toI2IModelId(falModelId: string): string | null {
  const supported: string[] = [
    // Add your supported I2I fal.ai model IDs here
    // e.g. 'fal-ai/your-model',
  ]
  return supported.includes(falModelId) ? `${falModelId}/edit` : null
}

/**
 * Build the T2I input payload for each supported model.
 * Settings keys use camelCase from the frontend; converted to snake_case here.
 * TODO: Customize this for your fal.ai models.
 */
function buildT2IInput(
  falModelId: string,
  prompt: string,
  settings: Record<string, unknown>,
  negativePrompt?: string,
): Record<string, unknown> {
  const aspectRatio = (settings.aspectRatio as string | undefined) ?? 'auto'
  const outputFormat = (settings.outputFormat as string | undefined) ?? 'png'

  // Fallback: spread settings as-is
  const input: Record<string, unknown> = { prompt, ...settings }
  if (negativePrompt) input.negative_prompt = negativePrompt
  return input
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const {
    prompt,
    negativePrompt,
    modelId,
    userId,
    settings = {},
    sourceImage,
    sourceImage2,
    i2iOptions,
    resolutionMultiplier = 1,
  } = params

  const supabase = createServiceClient()
  const { data: model, error: modelError } = await supabase
    .from('ai_models')
    .select('fal_model_id, credit_cost, name, requires_image')
    .eq('id', modelId)
    .eq('is_active', true)
    .single()

  if (modelError || !model) {
    throw new Error(`Model not found: ${modelId}`)
  }

  const requiresImage = Boolean(model.requires_image)
  const i2iModelId = sourceImage ? toI2IModelId(model.fal_model_id) : null
  const useI2I = requiresImage || i2iModelId !== null
  const actualCost = Math.ceil(model.credit_cost * resolutionMultiplier)

  const balance = await getCredits(userId)
  if (balance.total_credits < actualCost) {
    throw new InsufficientCreditsError(balance.total_credits, actualCost)
  }

  const fal = createFal()
  let result: { data: unknown }

  if (useI2I) {
    if (!sourceImage) {
      throw new Error('This model requires a reference image')
    }
    const url1 = await fal.storage.upload(sourceImage)
    const urls = [url1]
    if (sourceImage2) {
      urls.push(await fal.storage.upload(sourceImage2))
    }
    const opts = i2iOptions ?? defaultI2IOptions()
    const falI2IId = i2iModelId ?? model.fal_model_id
    const input = buildI2IInput(falI2IId, prompt, urls, opts)
    result = await fal.subscribe(falI2IId as never, {
      input: input as never,
      logs: false,
    })
  } else {
    const input = buildT2IInput(model.fal_model_id, prompt, settings, negativePrompt)
    result = await fal.subscribe(model.fal_model_id as never, {
      input: input as never,
      logs: false,
    })
  }

  const output = result.data as FalOutput
  const image = output?.images?.[0] ?? output?.image

  if (!image?.url) {
    throw new Error('fal.ai returned no image')
  }

  const promptSnippet = prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt
  await deductCredits(
    userId,
    actualCost,
    `fal:${model.fal_model_id}`,
    `${model.name}: ${promptSnippet}`
  )

  return {
    imageUrl: image.url,
    width: image.width ?? 1024,
    height: image.height ?? 1024,
    creditsUsed: actualCost,
  }
}
