// On-device face geometry from MediaPipe Face Landmarker points.
// Shared by the app's free preview and the marketing site's free tools, so
// both show the same numbers. Everything here is plain math on 2D points:
// no photo leaves the browser and no model call costs money.
//
// These are estimates from one frontal photo. Head pose, lens distortion and
// hair covering the forehead all move the points, so every result carries a
// reliability flag and the UI must say what a photo cannot show.

export type Point = { x: number; y: number }
export type FaceShapeName = 'Oval' | 'Round' | 'Square' | 'Oblong' | 'Heart' | 'Diamond'

// Face Landmarker indices (canonical 468-point mesh).
const L = {
  top: 10,
  chin: 152,
  glabella: 9,
  subnasale: 2,
  noseTip: 1,
  cheekL: 234,
  cheekR: 454,
  jawL: 172,
  jawR: 397,
  foreheadL: 54,
  foreheadR: 284,
  eyeOuterL: 33,
  eyeInnerL: 133,
  eyeOuterR: 263,
  eyeInnerR: 362,
  eyeTopL: 159,
  eyeBottomL: 145,
  eyeTopR: 386,
  eyeBottomR: 374,
  mouthL: 61,
  mouthR: 291,
  browL: 105,
  browR: 334
} as const

// Mirror pairs for the symmetry estimate (left index, right index).
const PAIRS: Array<[number, number, string]> = [
  [L.eyeOuterL, L.eyeOuterR, 'eye corners'],
  [L.eyeInnerL, L.eyeInnerR, 'inner eyes'],
  [L.browL, L.browR, 'brows'],
  [L.cheekL, L.cheekR, 'cheeks'],
  [L.jawL, L.jawR, 'jaw'],
  [L.mouthL, L.mouthR, 'mouth corners']
]

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Normalized landmarks (0..1) to pixels, so ratios are not squashed by the aspect ratio. */
export function toPixels(landmarks: Point[], width: number, height: number): Point[] {
  return landmarks.map((p) => ({ x: p.x * width, y: p.y * height }))
}

/**
 * Rotate points so the face midline (forehead → chin) is vertical. Removes
 * head roll, which otherwise shows up as fake asymmetry and fake eye tilt.
 */
export function uprightFace(points: Point[]): { points: Point[]; rollDegrees: number } {
  const top = points[L.top],
    chin = points[L.chin]
  const angle = Math.atan2(chin.x - top.x, chin.y - top.y)
  const cos = Math.cos(angle),
    sin = Math.sin(angle)
  const out = points.map((p) => {
    const dx = p.x - top.x,
      dy = p.y - top.y
    return { x: top.x + dx * cos - dy * sin, y: top.y + dx * sin + dy * cos }
  })
  return { points: out, rollDegrees: round((angle * 180) / Math.PI, 1) }
}

/** Rough left/right head turn from where the nose tip sits between the cheeks (-1..1). */
export function yawEstimate(points: Point[]) {
  const left = points[L.cheekL].x,
    right = points[L.cheekR].x
  const mid = (left + right) / 2
  return round(clamp((points[L.noseTip].x - mid) / ((right - left) / 2), -1, 1))
}

export interface FaceMeasurements {
  faceLength: number
  cheekWidth: number
  jawWidth: number
  foreheadWidth: number
  lengthToWidth: number
  jawToCheek: number
  foreheadToJaw: number
  goldenRatioDeviation: number
}

export function measure(points: Point[]): FaceMeasurements {
  const faceLength = dist(points[L.top], points[L.chin])
  const cheekWidth = dist(points[L.cheekL], points[L.cheekR])
  const jawWidth = dist(points[L.jawL], points[L.jawR])
  const foreheadWidth = dist(points[L.foreheadL], points[L.foreheadR])
  const lengthToWidth = faceLength / cheekWidth
  return {
    faceLength: round(faceLength, 1),
    cheekWidth: round(cheekWidth, 1),
    jawWidth: round(jawWidth, 1),
    foreheadWidth: round(foreheadWidth, 1),
    lengthToWidth: round(lengthToWidth),
    jawToCheek: round(jawWidth / cheekWidth),
    foreheadToJaw: round(foreheadWidth / jawWidth),
    // The landmark mesh starts below the hairline, so faces measure shorter
    // than a ruler would; 1.618 is compared against the mesh-adjusted 1.3.
    goldenRatioDeviation: round(Math.abs(lengthToWidth - 1.3) / 1.3, 3)
  }
}

/**
 * Face shape from proportions. Returns every shape with a fit score so the
 * UI can show "mostly oval, partly heart" instead of a false certainty.
 */
export function classifyFaceShape(m: FaceMeasurements): { shape: FaceShapeName; scores: Record<FaceShapeName, number> } {
  const lw = m.lengthToWidth,
    jc = m.jawToCheek,
    fj = m.foreheadToJaw
  const near = (value: number, target: number, spread: number) => Math.max(0, 1 - Math.abs(value - target) / spread)
  // Centres are calibrated to Face Landmarker output, whose mesh starts at
  // the upper forehead and whose jaw points sit high: real faces measure
  // length/width about 1.15–1.45 and jaw/cheek about 0.76–0.90.
  const foreheadToCheek = m.foreheadWidth / m.cheekWidth
  const scores: Record<FaceShapeName, number> = {
    Oblong: near(lw, 1.46, 0.12) * 0.75 + near(jc, 0.8, 0.06) * 0.25,
    Round: near(lw, 1.15, 0.1) * 0.6 + near(jc, 0.83, 0.05) * 0.4,
    Square: near(lw, 1.2, 0.12) * 0.35 + near(jc, 0.89, 0.04) * 0.65,
    Oval: near(lw, 1.3, 0.1) * 0.6 + near(jc, 0.8, 0.05) * 0.4,
    Heart: near(fj, 1.16, 0.08) * 0.6 + near(jc, 0.76, 0.05) * 0.4,
    Diamond: near(foreheadToCheek, 0.78, 0.06) * 0.6 + near(jc, 0.77, 0.05) * 0.4
  }
  const shape = (Object.keys(scores) as FaceShapeName[]).reduce((a, b) => (scores[b] > scores[a] ? b : a))
  return { shape, scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, round(v)])) as Record<FaceShapeName, number> }
}

/** 0–100 apparent left/right balance of paired features around the midline. */
export function symmetry(points: Point[]) {
  const midX = (points[L.top].x + points[L.chin].x) / 2
  const width = dist(points[L.cheekL], points[L.cheekR])
  const parts = PAIRS.map(([a, b, label]) => {
    const pa = points[a],
      pb = points[b]
    const horizontal = Math.abs(Math.abs(midX - pa.x) - Math.abs(pb.x - midX)) / width
    const vertical = Math.abs(pa.y - pb.y) / width
    return { label, deviation: horizontal + vertical }
  })
  const mean = parts.reduce((s, p) => s + p.deviation, 0) / parts.length
  return {
    // Frontal photos of ordinary faces deviate about 0.02–0.05 on this
    // measure; a turned head reaches 0.15+, which the yaw warning flags.
    score: Math.round(clamp(100 - mean * 400, 40, 99)),
    mostBalanced: parts.reduce((a, b) => (b.deviation < a.deviation ? b : a)).label,
    leastBalanced: parts.reduce((a, b) => (b.deviation > a.deviation ? b : a)).label
  }
}

/** Positive = outer corner higher than inner corner, in degrees, per eye. */
export function canthalTilt(points: Point[]) {
  // Image y grows downwards, so an outer corner above the inner one has a smaller y.
  const tilt = (inner: Point, outer: Point) =>
    round((Math.atan2(inner.y - outer.y, Math.abs(outer.x - inner.x)) * 180) / Math.PI, 1)
  const left = tilt(points[L.eyeInnerL], points[L.eyeOuterL])
  const right = tilt(points[L.eyeInnerR], points[L.eyeOuterR])
  const mean = (left + right) / 2
  return {
    left,
    right,
    mean: round(mean, 1),
    label: mean > 2 ? 'positive' : mean < -2 ? 'negative' : 'neutral'
  } as const
}

export function eyeShape(points: Point[]) {
  const openness = (top: Point, bottom: Point, a: Point, b: Point) => dist(top, bottom) / dist(a, b)
  const ratio =
    (openness(points[L.eyeTopL], points[L.eyeBottomL], points[L.eyeInnerL], points[L.eyeOuterL]) +
      openness(points[L.eyeTopR], points[L.eyeBottomR], points[L.eyeInnerR], points[L.eyeOuterR])) /
    2
  const spacing =
    dist(points[L.eyeInnerL], points[L.eyeInnerR]) /
    ((dist(points[L.eyeInnerL], points[L.eyeOuterL]) + dist(points[L.eyeInnerR], points[L.eyeOuterR])) / 2)
  const tilt = canthalTilt(points).label
  const shape = ratio > 0.36 ? 'round' : ratio < 0.24 ? 'narrow almond' : 'almond'
  return {
    shape: tilt === 'positive' ? `upturned ${shape}` : tilt === 'negative' ? `downturned ${shape}` : shape,
    openness: round(ratio),
    // Rule of fifths: the gap between the eyes is about one eye width.
    spacing: round(spacing),
    spacingLabel: spacing > 1.15 ? 'wide-set' : spacing < 0.88 ? 'close-set' : 'balanced'
  }
}

/** Middle third (brow to nose base) vs lower third (nose base to chin). */
export function facialThirds(points: Point[]) {
  const middle = dist(points[L.glabella], points[L.subnasale])
  const lower = dist(points[L.subnasale], points[L.chin])
  return { middle: round(middle, 1), lower: round(lower, 1), lowerToMiddle: round(lower / middle) }
}

export interface FaceGeometry {
  reliable: boolean
  warnings: string[]
  rollDegrees: number
  yaw: number
  measurements: FaceMeasurements
  faceShape: ReturnType<typeof classifyFaceShape>
  symmetry: ReturnType<typeof symmetry>
  canthalTilt: ReturnType<typeof canthalTilt>
  eyes: ReturnType<typeof eyeShape>
  thirds: ReturnType<typeof facialThirds>
}

export function analyzeFace(landmarks: Point[], width: number, height: number): FaceGeometry {
  if (landmarks.length < 468) throw new Error('Not enough face points')
  const { points, rollDegrees } = uprightFace(toPixels(landmarks, width, height))
  const yaw = yawEstimate(points)
  const warnings: string[] = []
  if (Math.abs(yaw) > 0.18) warnings.push('Your head is turned to one side, which skews symmetry and face shape.')
  if (Math.abs(rollDegrees) > 12) warnings.push('Your head is tilted; we corrected for it, but a straight photo is more accurate.')
  if (dist(points[L.cheekL], points[L.cheekR]) < 160) warnings.push('Your face is small in this photo; a closer selfie gives steadier numbers.')
  const measurements = measure(points)
  return {
    reliable: warnings.length === 0,
    warnings,
    rollDegrees,
    yaw,
    measurements,
    faceShape: classifyFaceShape(measurements),
    symmetry: symmetry(points),
    canthalTilt: canthalTilt(points),
    eyes: eyeShape(points),
    thirds: facialThirds(points)
  }
}
