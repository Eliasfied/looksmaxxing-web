import { adminDb } from './firebase/admin'
import { glowFromDoc, type GlowAccess } from './entitlement'
import { isChecklistKey, type GlowIntake, type GlowPlanContent } from './glow-plan'

/** A plan can be regenerated a couple of times (new answers, better photo). */
export const MAX_GENERATIONS = 3

export interface GlowPlanState {
  access: GlowAccess | null
  intake: GlowIntake | null
  plan: GlowPlanContent | null
  startedAt: string | null
  baselineScanId: string | null
  done: Record<string, boolean>
  generations: number
}

export function stateFromDoc(data: Record<string, unknown> | undefined): GlowPlanState {
  return {
    access: glowFromDoc(data),
    intake: (data?.intake as GlowIntake) ?? null,
    plan: (data?.plan as GlowPlanContent) ?? null,
    startedAt: typeof data?.started_at === 'string' ? data.started_at : null,
    baselineScanId: typeof data?.baseline_scan_id === 'string' ? data.baseline_scan_id : null,
    done: (data?.done as Record<string, boolean>) ?? {},
    generations: Number(data?.generations) || 0
  }
}

const ref = (userId: string) => adminDb.collection('glow_plans').doc(userId)

export async function getGlowState(userId: string) {
  return stateFromDoc((await ref(userId).get()).data())
}

/** Counts the attempt before the model runs, so retries cannot exceed the cap. */
export async function reserveGeneration(userId: string) {
  return adminDb.runTransaction(async (tx) => {
    const state = stateFromDoc((await tx.get(ref(userId))).data())
    if (!state.access?.active) return 'inactive' as const
    if (state.generations >= MAX_GENERATIONS) return 'limit' as const
    tx.set(ref(userId), { generations: state.generations + 1 }, { merge: true })
    return 'ok' as const
  })
}

export async function releaseGeneration(userId: string) {
  await adminDb.runTransaction(async (tx) => {
    const state = stateFromDoc((await tx.get(ref(userId))).data())
    tx.set(ref(userId), { generations: Math.max(0, state.generations - 1) }, { merge: true })
  })
}

export async function saveGlowPlan(
  userId: string,
  data: { intake: GlowIntake; plan: GlowPlanContent; scanId: string; keepStart: boolean }
) {
  const current = await getGlowState(userId)
  await ref(userId).set(
    {
      intake: data.intake,
      plan: data.plan,
      baseline_scan_id: current.baselineScanId && data.keepStart ? current.baselineScanId : data.scanId,
      started_at: current.startedAt && data.keepStart ? current.startedAt : new Date().toISOString(),
      generated_at: new Date().toISOString(),
      ...(data.keepStart ? {} : { done: {} })
    },
    { merge: true }
  )
}

export async function toggleGlowTask(userId: string, key: string, value: boolean) {
  return adminDb.runTransaction(async (tx) => {
    const state = stateFromDoc((await tx.get(ref(userId))).data())
    if (!state.plan || !isChecklistKey(state.plan, key)) throw new Error('Unknown task')
    tx.update(ref(userId), { [`done.${key}`]: value })
    return { ...state.done, [key]: value }
  })
}
