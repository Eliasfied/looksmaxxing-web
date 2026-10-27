import { appConfig } from './config'

// One source for what Aura Pro contains, shared by every paywall and the
// pricing page so the promise never drifts between screens.
export const PRO_PILLARS = [
  {
    key: 'analyze',
    title: 'Analyze',
    line: 'Full face scan and all 11 AI analyses',
    detail: 'PSL score with 9 sub-scores, face shape, jawline, eyes, symmetry, haircut and women’s styling reports.'
  },
  {
    key: 'try',
    title: 'Try on',
    line: `Try-on studio, ${Math.floor(100 / appConfig.credits.tryOn)} looks a month`,
    detail: 'Haircuts, hair color, beards, glasses and a bald preview on your own photo.'
  },
  {
    key: 'do',
    title: 'Follow',
    line: 'Your personal plan and AI coach',
    detail: 'A daily checklist built from your results, and a coach that knows your scan and your plan.'
  },
  {
    key: 'track',
    title: 'Track',
    line: 'Progress over time',
    detail: 'Monthly re-scans, score history and side-by-side before/after comparisons.'
  }
] as const

export const PRO_PLANS = appConfig.pricing.plans.map((plan) => {
  const monthly = plan.interval === 'yearly' ? plan.price / 12 : plan.price
  return { ...plan, monthly }
})

export function yearlySaving() {
  const month = PRO_PLANS.find((p) => p.interval === 'monthly')
  const year = PRO_PLANS.find((p) => p.interval === 'yearly')
  if (!month || !year) return 0
  return Math.round((1 - year.price / (month.price * 12)) * 100)
}
