import { loadImage } from '../../../config/face-landmarker'

// Shrinks a chosen photo in the browser before it goes anywhere, so uploads
// stay small and EXIF metadata (location, device) is dropped by the canvas.
export async function preparePhoto(file: File, maxSide = 1280): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12_000_000)
    throw new Error('Choose a JPG, PNG or WebP photo smaller than 12 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this photo.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function dataUrlToBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob()
}
