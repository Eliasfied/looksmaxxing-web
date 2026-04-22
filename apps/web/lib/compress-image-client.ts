/** Max file size before compression (client validation). */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * Browser-only: downscale large photos before upload to avoid request size limits.
 */
export function compressImageForUpload(file: File, maxSide = 1920, quality = 0.88): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(file)
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return Promise.reject(new Error('File too large (max 10MB)'))
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= maxSide && height <= maxSide) {
        resolve(file)
        return
      }
      const scale = maxSide / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}
