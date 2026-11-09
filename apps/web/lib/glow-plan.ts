// The 30-Day Glow-Up Plan: intake, the model's plan, and the daily checklist.
// Pure helpers live here so they can be tested without Firestore or the model.

import { TRYON_CATALOG } from './tryon-catalog'

export const PLAN_DAYS = 30

export const AREAS = ['skin', 'hair', 'face', 'nutrition', 'training', 'style'] as const
export type Area = (typeof AREAS)[number]

export const AREA_LABELS: Record<Area, string> = {
  skin: 'Skin',
  hair: 'Hair',
  face: 'Face & jawline',
  nutrition: 'Nutrition',
  training: 'Training',
  style: 'Style & grooming'
}

/* ---------- Intake ---------- */

export const INTAKE_OPTIONS = {
  audience: ['men', 'women'],
  age: ['under-18', '18-24', '25-34', '35-44', '45-plus'],
  skinType: ['oily', 'dry', 'combination', 'normal', 'sensitive', 'unsure'],
  skinConcerns: ['acne', 'dark-circles', 'texture', 'redness', 'dullness', 'oiliness'],
  hairType: ['straight', 'wavy', 'curly', 'coily'],
  hairConcerns: ['thinning', 'frizz', 'dandruff', 'no-style', 'damage'],
  facialHair: ['none', 'stubble', 'beard', 'patchy'],
  body: ['lean', 'average', 'some-extra', 'a-lot-extra'],
  training: ['none', 'home', 'gym'],
  diet: ['everything', 'vegetarian', 'vegan'],
  sleep: ['under-6', '6-7', '7-8', '8-plus'],
  minutes: ['10', '20', '40'],
  budget: ['low', 'medium', 'high']
} as const

type Opt<K extends keyof typeof INTAKE_OPTIONS> = (typeof INTAKE_OPTIONS)[K][number]

export interface GlowIntake {
  audience: Opt<'audience'>
  age: Opt<'age'>
  goals: Area[]
  skinType: Opt<'skinType'>
  skinConcerns: Opt<'skinConcerns'>[]
  hairType: Opt<'hairType'>
  hairConcerns: Opt<'hairConcerns'>[]
  facialHair: Opt<'facialHair'>
  body: Opt<'body'>
  training: Opt<'training'>
  diet: Opt<'diet'>
  sleep: Opt<'sleep'>
  minutes: Opt<'minutes'>
  budget: Opt<'budget'>
  note: string
}

function one<K extends keyof typeof INTAKE_OPTIONS>(raw: Record<string, unknown>, key: K): Opt<K> {
  const value = raw[key]
  const allowed = INTAKE_OPTIONS[key] as readonly string[]
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`Invalid ${key}`)
  return value as Opt<K>
}

function many<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((v): v is T => typeof v === 'string' && allowed.includes(v as T)))]
}

export function parseIntake(input: unknown): GlowIntake {
  if (!input || typeof input !== 'object') throw new Error('Invalid intake')
  const raw = input as Record<string, unknown>
  const goals = many(raw.goals, AREAS)
  if (!goals.length) throw new Error('Pick at least one goal')
  return {
    audience: one(raw, 'audience'),
    age: one(raw, 'age'),
    goals,
    skinType: one(raw, 'skinType'),
    skinConcerns: many(raw.skinConcerns, INTAKE_OPTIONS.skinConcerns),
    hairType: one(raw, 'hairType'),
    hairConcerns: many(raw.hairConcerns, INTAKE_OPTIONS.hairConcerns),
    facialHair: raw.facialHair === undefined ? 'none' : one(raw, 'facialHair'),
    body: one(raw, 'body'),
    training: one(raw, 'training'),
    diet: one(raw, 'diet'),
    sleep: one(raw, 'sleep'),
    minutes: one(raw, 'minutes'),
    budget: one(raw, 'budget'),
    note: typeof raw.note === 'string' ? raw.note.replace(/\s+/g, ' ').trim().slice(0, 300) : ''
  }
}

/* ---------- Plan content ---------- */

export interface RoutineStep {
  step: string
  detail: string
}
export interface Habit {
  id: string
  area: Area
  text: string
  detail: string
}
export interface DayTask {
  area: Area
  text: string
}
export interface PlanDay {
  day: number
  title: string
  tasks: DayTask[]
}
export interface Product {
  area: Area
  type: string
  lookFor: string
  why: string
  budget: string
}
export interface GlowPlanContent {
  headline: string
  summary: string
  focus: { area: Area; title: string; finding: string; goal: string }[]
  morning: RoutineStep[]
  evening: RoutineStep[]
  habits: Habit[]
  workouts: { title: string; detail: string }[]
  trainingDays: number
  days: PlanDay[]
  products: Product[]
  looks: { hair: string[]; beard: string | null; glasses: string | null; color: string | null }
  expectations: { when: string; text: string }[]
  limits: string[]
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
const area = (value: unknown, fallback: Area = 'style'): Area =>
  AREAS.includes(value as Area) ? (value as Area) : fallback
const list = (value: unknown) => (Array.isArray(value) ? value : [])

const lookIds = (type: string) => TRYON_CATALOG.find((c) => c.type === type)?.options.map((o) => o.id) ?? []

// The model sometimes echoes the hint or the label; map both back to the id.
const slug = (v: string) => v.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
function pickLook(value: unknown, type: string) {
  const wanted = slug(text(value, 80))
  return lookIds(type).includes(wanted) ? wanted : null
}

// Fixed check-points, the same for everyone, so the plan always ends with a
// comparable re-scan no matter what the model wrote.
export const MILESTONES: Record<number, string> = {
  1: 'Set two phone reminders: one for your morning routine, one for the evening.',
  7: 'Progress photo: same spot, same light, same angle as your day-1 scan.',
  14: 'Halfway check: photo again, and note which habit you skipped most.',
  21: 'Progress photo, and adjust one habit that is not working for you.',
  30: 'Re-scan your face and compare it with day 1.'
}

/**
 * Turns the model's JSON into a plan we can trust: known areas only, bounded
 * lengths, exactly 30 days, and try-on looks from the real catalog.
 */
export function sanitizePlan(raw: unknown): GlowPlanContent {
  if (!raw || typeof raw !== 'object') throw new Error('Plan was empty')
  const r = raw as Record<string, unknown>
  const steps = (v: unknown) =>
    list(v)
      .map((s) => ({ step: text((s as RoutineStep)?.step, 80), detail: text((s as RoutineStep)?.detail, 220) }))
      .filter((s) => s.step)
      .slice(0, 6)

  const byDay = new Map<number, PlanDay>()
  for (const d of list(r.days)) {
    const day = Number((d as PlanDay)?.day)
    if (!Number.isInteger(day) || day < 1 || day > PLAN_DAYS || byDay.has(day)) continue
    const tasks = list((d as PlanDay).tasks)
      .map((t) => ({ area: area((t as DayTask)?.area), text: text((t as DayTask)?.text, 200) }))
      .filter((t) => t.text)
      .slice(0, 3)
    byDay.set(day, { day, title: text((d as PlanDay).title, 70) || `Day ${day}`, tasks })
  }

  const plan: GlowPlanContent = {
    headline: text(r.headline, 90) || 'Your 30-day glow-up plan',
    summary: text(r.summary, 600),
    focus: list(r.focus)
      .map((f) => {
        const x = f as Record<string, unknown>
        return { area: area(x.area), title: text(x.title, 70), finding: text(x.finding, 260), goal: text(x.goal, 200) }
      })
      .filter((f) => f.title)
      .slice(0, 5),
    morning: steps(r.morning),
    evening: steps(r.evening),
    habits: list(r.habits)
      .map((h, i) => {
        const x = h as Record<string, unknown>
        return { id: `h${i}`, area: area(x.area), text: text(x.text, 120), detail: text(x.detail, 220) }
      })
      .filter((h) => h.text)
      .slice(0, 8)
      .map((h, i) => ({ ...h, id: `h${i}` })),
    workouts: list(r.workouts)
      .map((w) => ({ title: text((w as Record<string, unknown>).title, 60), detail: text((w as Record<string, unknown>).detail, 500) }))
      .filter((w) => w.title)
      .slice(0, 3),
    trainingDays: Math.max(0, Math.min(6, Math.round(Number(r.trainingDays) || 0))),
    days: Array.from({ length: PLAN_DAYS }, (_, i) => byDay.get(i + 1) ?? { day: i + 1, title: `Day ${i + 1}`, tasks: [] }),
    products: list(r.products)
      .map((p) => {
        const x = p as Record<string, unknown>
        return { area: area(x.area, 'skin'), type: text(x.type, 60), lookFor: text(x.lookFor, 160), why: text(x.why, 200), budget: text(x.budget, 50) }
      })
      .filter((p) => p.type)
      .slice(0, 10),
    looks: {
      hair: [...new Set(list((r.looks as Record<string, unknown>)?.hair).map((v) => pickLook(v, 'hair')).filter(Boolean) as string[])].slice(0, 3),
      beard: pickLook((r.looks as Record<string, unknown>)?.beard, 'beard'),
      glasses: pickLook((r.looks as Record<string, unknown>)?.glasses, 'glasses'),
      color: pickLook((r.looks as Record<string, unknown>)?.color, 'color')
    },
    expectations: list(r.expectations)
      .map((e) => ({ when: text((e as Record<string, unknown>).when, 30), text: text((e as Record<string, unknown>).text, 260) }))
      .filter((e) => e.when && e.text)
      .slice(0, 5),
    limits: list(r.limits).map((l) => text(l, 220)).filter(Boolean).slice(0, 4)
  }
  if (!plan.workouts.length) plan.trainingDays = 0
  if (plan.morning.length < 1 || plan.evening.length < 1 || plan.habits.length < 3)
    throw new Error('Plan was incomplete')
  if (plan.days.filter((d) => d.tasks.length).length < 20) throw new Error('Plan was incomplete')
  return plan
}

/* ---------- Daily checklist ---------- */

const TRAINING_PATTERN: Record<number, number[]> = {
  0: [],
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5]
}

export function workoutForDay(plan: Pick<GlowPlanContent, 'trainingDays' | 'workouts'>, day: number) {
  if (!plan.workouts.length) return null
  const pattern = TRAINING_PATTERN[plan.trainingDays] ?? []
  const weekday = (day - 1) % 7
  if (!pattern.includes(weekday)) return null
  // Rotate through the workouts across the whole plan, not per week.
  const sessionIndex = Math.floor((day - 1) / 7) * pattern.length + pattern.indexOf(weekday)
  return plan.workouts[sessionIndex % plan.workouts.length]
}

export interface ChecklistItem {
  key: string
  area: Area | 'routine' | 'milestone'
  text: string
  detail?: string
  steps?: RoutineStep[]
}

/** Everything to tick off on one plan day. Keys are `${day}-${id}`. */
export function checklistForDay(plan: GlowPlanContent, day: number): ChecklistItem[] {
  const items: ChecklistItem[] = []
  if (MILESTONES[day]) items.push({ key: `${day}-m`, area: 'milestone', text: MILESTONES[day] })
  items.push({ key: `${day}-am`, area: 'routine', text: 'Morning routine', steps: plan.morning })
  plan.days[day - 1]?.tasks.forEach((t, i) => items.push({ key: `${day}-t${i}`, area: t.area, text: t.text }))
  const workout = workoutForDay(plan, day)
  if (workout) items.push({ key: `${day}-w`, area: 'training', text: workout.title, detail: workout.detail })
  plan.habits.forEach((h) => items.push({ key: `${day}-${h.id}`, area: h.area, text: h.text, detail: h.detail }))
  items.push({ key: `${day}-pm`, area: 'routine', text: 'Evening routine', steps: plan.evening })
  return items
}

export function isChecklistKey(plan: GlowPlanContent, key: string) {
  const match = /^(\d{1,2})-([a-z0-9]{1,4})$/.exec(key)
  if (!match) return false
  const day = Number(match[1])
  if (day < 1 || day > PLAN_DAYS) return false
  return checklistForDay(plan, day).some((item) => item.key === key)
}

/** Day of the plan in the viewer's calendar (1-based, clamped to 1..30). */
export function planDay(startedAt: string, now = new Date()) {
  const start = new Date(startedAt)
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = Math.round((b - a) / 86_400_000) + 1
  return Math.max(1, Math.min(PLAN_DAYS, day))
}

export function dayProgress(plan: GlowPlanContent, done: Record<string, boolean>, day: number) {
  const items = checklistForDay(plan, day)
  const count = items.filter((i) => done[i.key]).length
  return { count, total: items.length }
}

/* ---------- Prompt ---------- */

interface ScanSummary {
  overallPslScore?: number
  potentialPslScore?: number
  skinType?: string
  details?: Record<string, string | undefined>
  recommendations?: Record<string, string | undefined>
  categoryAnalysis?: Record<string, string[]>
  [score: string]: unknown
}

const SCORE_KEYS = [
  'gonialAngleScore',
  'midfaceRatioScore',
  'cheekboneScore',
  'canthalTiltScore',
  'upperEyelidScore',
  'ipdScore',
  'skinClarityScore',
  'hairlineScore',
  'symmetryScore'
]

export function buildPlanPrompt(intake: GlowIntake, scan: ScanSummary) {
  const scores = Object.fromEntries(SCORE_KEYS.map((k) => [k, scan[k]]))
  const catalog = Object.fromEntries(
    TRYON_CATALOG.filter((c) => ['hair', 'beard', 'glasses', 'color'].includes(c.type)).map((c) => [
      c.type,
      c.options.map((o) => (o.shapes ? `${o.id} (suits ${o.shapes.join('/')})` : o.id))
    ])
  )
  const minor = intake.age === 'under-18'
  return `You are Aura, an honest glow-up coach. Write a personal 30-day plan for this person.

THEIR FACE SCAN (AI estimate from one photo):
${JSON.stringify({
    overallPslScore: scan.overallPslScore,
    potentialPslScore: scan.potentialPslScore,
    skinType: scan.skinType,
    details: scan.details,
    scores,
    observations: scan.categoryAnalysis,
    recommendations: scan.recommendations
  })}

THEIR ANSWERS:
${JSON.stringify(intake)}

WRITE THE PLAN SO THAT:
- It is for ${intake.audience === 'women' ? 'a woman' : 'a man'} and uses their answers: goals first (${intake.goals.join(', ')}), about ${intake.minutes} minutes a day, a ${intake.budget} budget, training access "${intake.training}", diet "${intake.diet}".
- Every focus area cites something concrete from the scan or the answers ("finding") and a goal reachable in 30 days.
- Morning and evening routines fit the skin type and concerns. 2–5 steps each, in order. Name the product type with its active ingredient and strength ("Salicylic acid 2% cleanser", "Niacinamide 5% serum", "SPF 50 fluid"), not brands; "detail" says how much, how often and how to start slowly.
- habits: 4–7 small things to do EVERY day, each with a concrete number or time in the text ("2.5 l water", "120 g protein", "8,000 steps", "In bed by 23:00"), sized to their body, diet and goals. Possible: water, protein, steps, sleep window, posture, tongue posture as a posture habit, sunscreen reapply. "detail" says how to make it easy.
- workouts: ${intake.training === 'none' ? 'at most 2 short bodyweight sessions, or none if they did not pick training as a goal' : '2–3 sessions matching their equipment'}, each detail listing exercises with sets × reps. trainingDays: 0–5 per week.
- days: all 30 days. Each day has a short title and 1–2 specific, concrete tasks (what exactly, how long, what to say to the barber) that build week by week: week 1 set-up (buy basics, book a barber or salon with a brief, clean up brows), week 2 consistency, week 3 upgrades, week 4 lock in. Do not repeat the daily habits or routines as day tasks.
- products: 4–8 product types with what to look for (ingredients, SPF, hold); "budget" is only a short price range like "$5–12".
- looks: pick try-on looks ONLY from these ids: ${JSON.stringify(catalog)}. Use the bare id, without the text in brackets. hair: 1–3 ids that suit their face shape${intake.audience === 'women' ? ' (prefer the longer and framing styles)' : ''}. beard: an id or null${intake.audience === 'women' ? ' (use null)' : ''}. glasses and color: an id or null.
- expectations: honest, for "Week 1", "Week 2", "Day 30" and "After 30 days". What they will likely see and feel; skin and grooming show first, body changes are small in a month.
- limits: 2–3 honest sentences on what 30 days cannot change (bone structure, eye shape, height), and when to see a dermatologist or doctor instead.

SAFETY RULES:
- No surgery, fillers, injections, prescription drugs, finasteride/minoxidil dosing, steroids, peptides, bone smashing or extreme diets. If something needs medical help, say "talk to a dermatologist" or "talk to a doctor".
- Mewing does not change bone structure; only mention tongue posture as a posture habit.
- Fat loss: at most a gentle 300–500 kcal deficit, never below a healthy weight, no fasting challenges.${minor ? '\n- They are under 18: no calorie deficit, no supplements, no retinoids or acids stronger than a gentle cleanser, moisturizer and SPF. Focus on sleep, food quality, grooming, posture and sport.' : ''}
- Respect their preferences. Never judge their worth. Plain, friendly, specific language.

Return ONLY valid JSON with exactly this shape:
{
  "headline": "short personal title",
  "summary": "2–3 sentences: where they stand and what the next 30 days focus on",
  "focus": [{"area": "skin|hair|face|nutrition|training|style", "title": "", "finding": "", "goal": ""}],
  "morning": [{"step": "", "detail": ""}],
  "evening": [{"step": "", "detail": ""}],
  "habits": [{"area": "", "text": "", "detail": ""}],
  "workouts": [{"title": "Workout A: …", "detail": ""}],
  "trainingDays": 3,
  "days": [{"day": 1, "title": "", "tasks": [{"area": "", "text": ""}]}],
  "products": [{"area": "", "type": "", "lookFor": "", "why": "", "budget": ""}],
  "looks": {"hair": ["id"], "beard": null, "glasses": null, "color": null},
  "expectations": [{"when": "Week 1", "text": ""}],
  "limits": [""]
}`
}
