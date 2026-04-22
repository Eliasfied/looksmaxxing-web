/**
 * Build fal.ai image-to-image inputs per endpoint.
 * TODO: Add your own supported I2I models here.
 */

export type AspectRatio =
  | 'auto'
  | '1:1'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '3:2'
  | '2:3'

export type I2IUiOptions = {
  aspectRatio: AspectRatio
  nanoResolution: '0.5K' | '1K' | '2K' | '4K'
  outputFormat: 'png' | 'jpeg' | 'webp'
}

const DEFAULT_I2I: I2IUiOptions = {
  aspectRatio: 'auto',
  nanoResolution: '1K',
  outputFormat: 'png',
}

export function defaultI2IOptions(): I2IUiOptions {
  return { ...DEFAULT_I2I }
}

export function buildI2IInput(
  falModelId: string,
  prompt: string,
  imageUrls: string[],
  opts: I2IUiOptions,
): Record<string, unknown> {
  const { aspectRatio, nanoResolution, outputFormat } = opts

  // TODO: Add cases for your supported I2I fal.ai models.
  // Example:
  // if (falModelId === 'your-model/edit') {
  //   return { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, output_format: outputFormat, num_images: 1 }
  // }

  // Fallback: generic I2I input
  return {
    prompt,
    image_urls: imageUrls,
    aspect_ratio: aspectRatio,
    output_format: outputFormat,
    num_images: 1,
  }
}

export function parseI2IUiOptions(raw: unknown): I2IUiOptions {
  if (!raw || typeof raw !== 'object') return defaultI2IOptions()
  const o = raw as Record<string, unknown>

  const validAspects: AspectRatio[] = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3']
  const aspect: AspectRatio = validAspects.includes(o.aspectRatio as AspectRatio)
    ? (o.aspectRatio as AspectRatio)
    : 'auto'

  const nanoRes = ['0.5K', '1K', '2K', '4K'].includes(String(o.nanoResolution))
    ? (o.nanoResolution as I2IUiOptions['nanoResolution'])
    : '1K'

  const fmt =
    o.outputFormat === 'jpeg' || o.outputFormat === 'webp'
      ? o.outputFormat
      : 'png'

  return { aspectRatio: aspect, nanoResolution: nanoRes, outputFormat: fmt }
}
