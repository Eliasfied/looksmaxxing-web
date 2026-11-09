import { appConfig } from './config'

// One source for what the 30-day plan contains and costs, shared by every
// offer card, the sales page and the PDF so the promise never drifts.
export const GLOW = appConfig.pricing.glowPlan

export const GLOW_DISCOUNT =
  GLOW.compareAtPrice && GLOW.compareAtPrice > GLOW.price
    ? Math.round((1 - GLOW.price / GLOW.compareAtPrice) * 100)
    : 0

export const GLOW_LOOKS = Math.floor(GLOW.credits / appConfig.credits.tryOn)

export const GLOW_INCLUDES = [
  ['Big start scan', 'PSL score, 9 sub-scores and a short questionnaire about your skin, hair, body, time and budget.'],
  ['Your personal 30-day plan', 'Daily tasks for skin, hair, face & jawline, nutrition, training and style, built from your scan.'],
  ['Morning & evening routine', 'Step by step, matched to your skin type, with product types and what to look for.'],
  [`${GLOW_LOOKS} try-ons incl. Future Me`, 'Haircuts, beard, glasses and hair color on your own photo, plus a realistic day-30 goal picture.'],
  ['AI coach for 30 days', 'Ask anything. The coach knows your scan and your plan.'],
  ['Day-30 re-scan & PDF', 'Compare day 1 with day 30. Download the whole plan as a PDF to keep.']
] as const

export const usd = (n: number) => `$${n.toFixed(2)}`
