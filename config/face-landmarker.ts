// Browser-only loader for MediaPipe Face Landmarker. The WASM runtime and the
// model are fetched once from public CDNs; the photo itself is processed on
// the device and never uploaded.
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { analyzeFace, type FaceGeometry } from './face-geometry'

const VERSION = '0.10.35'
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let landmarker: Promise<FaceLandmarker> | null = null

function load() {
  landmarker ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(WASM)
    const create = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'IMAGE',
        numFaces: 2
      })
    // Some browsers expose WebGL but fail to build the GPU graph.
    return create('GPU').catch(() => create('CPU'))
  })().catch((error) => {
    landmarker = null
    throw error
  })
  return landmarker
}

/** Warm the model while the visitor is still choosing a photo. */
export function preloadFaceLandmarker() {
  void load().catch(() => {})
}

export class FaceNotFoundError extends Error {}

export async function analyzePhoto(image: HTMLImageElement): Promise<FaceGeometry> {
  const detector = await load()
  const result = detector.detect(image)
  const faces = result.faceLandmarks ?? []
  if (faces.length === 0) throw new FaceNotFoundError('We could not find a face. Try a brighter, frontal photo.')
  if (faces.length > 1) throw new FaceNotFoundError('We found more than one face. Use a photo with only you in it.')
  return analyzeFace(faces[0], image.naturalWidth, image.naturalHeight)
}

/**
 * Load an image element from a URL. Uses load events rather than
 * image.decode(), which can stay pending in some embedded or background views.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('This photo could not be opened. Try a JPG or PNG.'))
    image.src = url
    if (image.complete && image.naturalWidth) resolve(image)
  })
}

/** Load a File (or data URL) into a ready image element. */
export async function imageFrom(source: File | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  try {
    return await loadImage(url)
  } finally {
    if (typeof source !== 'string') setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}
