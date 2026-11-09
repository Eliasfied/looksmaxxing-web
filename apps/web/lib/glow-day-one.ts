// Day 1 of the 30-day plan, free, built from the on-device preview alone.
// It bridges "here are your measurements" and "here is your plan": three real
// tasks for today, then days 2 to 30 in the paid plan. Nothing here needs a
// server or AI call; it only reads face shape and eye geometry.

import type { FaceShapeName } from '../../../config/face-geometry'

export type Audience = 'men' | 'women'

export interface DayOneInput {
  shape: FaceShapeName
  tilt: 'positive' | 'neutral' | 'negative'
  spacing: 'wide-set' | 'close-set' | 'balanced' | string
}

export interface DayOneTask {
  id: 'hair' | 'brows' | 'skin'
  title: string
  detail: string
}

const HAIR: Record<FaceShapeName, Record<Audience, string>> = {
  Oval: {
    men: 'Most cuts suit an oval face. Ask for a textured crop or a side part, tidy sides, some length on top.',
    women: 'Most lengths suit an oval face. Ask for long layers that start below the chin to keep the balance.'
  },
  Round: {
    men: 'Height on top and short, tight sides add length: a quiff or textured pompadour. Avoid a full, rounded fringe.',
    women: 'Long layers starting below the chin and a side part add length. Skip chin-length, rounded bobs.'
  },
  Square: {
    men: 'Keep texture and some length on top to soften a strong jaw. Avoid a hard, boxy outline on the sides.',
    women: 'Soft, face-framing layers and side-swept waves soften strong angles at the jaw.'
  },
  Oblong: {
    men: 'Keep the sides a little fuller and skip extra height on top. A light fringe makes the face look shorter.',
    women: 'Volume at the sides and a fringe or curtain bangs balance length. Avoid long, flat hair with no layers.'
  },
  Heart: {
    men: 'Medium length with a side-swept top or light fringe. Avoid very short sides under a high, tall top.',
    women: 'Chin- to shoulder-length cuts with volume near the jaw, and a side-swept fringe, balance a wider forehead.'
  },
  Diamond: {
    men: 'A fuller fringe or textured top adds width at the forehead. Keep a little length at the sides.',
    women: 'Side-swept bangs and volume at forehead and chin. Tucking hair behind the ears shows your cheekbones.'
  }
}

function browTask(input: DayOneInput, audience: Audience): DayOneTask {
  const base =
    audience === 'women'
      ? 'Brush your brows up and fill only the sparse gaps with light strokes.'
      : 'Brush your brows up, trim only the longest hairs and clean up stray hairs between them.'
  const extra =
    input.tilt === 'negative'
      ? ' Keep the tail of the brow slightly lifted and never pluck from above: it lifts the outer eye.'
      : input.spacing === 'close-set'
        ? ' Clean up the inner ends a little: more space between the brows opens up close-set eyes.'
        : input.spacing === 'wide-set'
          ? ' Leave the inner ends full: they pull wide-set eyes visually closer.'
          : ' Follow your natural shape; the goal is groomed, not thin.'
  return { id: 'brows', title: 'Groom your brows (5 minutes)', detail: base + extra }
}

export function dayOneTasks(input: DayOneInput, audience: Audience): DayOneTask[] {
  return [
    {
      id: 'hair',
      title: audience === 'women' ? 'Save your salon brief' : 'Save your barber brief',
      detail: HAIR[input.shape][audience]
    },
    browTask(input, audience),
    {
      id: 'skin',
      title: 'Tonight: cleanse, moisturize, phone away',
      detail:
        'A gentle cleanser and a plain moisturizer, then no screen for the last 30 minutes before bed. Rest shows under the eyes first. Tomorrow morning: SPF 30 or higher.'
    }
  ]
}

/** What the paid plan adds after day 1, shown locked under the free tasks. */
export function lockedDays(audience: Audience): [day: string, task: string][] {
  return [
    ['Day 2', 'Your morning routine, matched to your skin type'],
    [
      'Day 3',
      audience === 'women'
        ? 'Face framing: hair, brows and posture in photos'
        : 'Jawline: posture, beard line or hair framing, less bloating'
    ],
    ['Day 7', 'First progress photo, same light as today'],
    ['Day 30', 'Re-scan and compare with day 1, side by side']
  ]
}
