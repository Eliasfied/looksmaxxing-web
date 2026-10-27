import { adminDb } from './firebase/admin'
import type { ToolReport } from './tool-report'

export interface PlanSection {
  title: string
  tasks: string[]
}

export interface StoredPlan {
  title: string
  tool: string
  reportId: string
  createdAt: string
  sections: PlanSection[]
  done: Record<string, boolean>
}

const MAX_TASKS = 60

// Only sections that carry tasks become part of the checklist; prose-only
// sections stay in the report.
export function planFromReport(report: ToolReport, tool: string, title: string, reportId: string): StoredPlan {
  const sections = report.sections
    .filter((s) => s.tasks?.length)
    .map((s) => ({ title: s.title, tasks: s.tasks!.slice(0, 12) }))
  if (!sections.length) throw new Error('This report has no tasks to follow.')
  return { title, tool, reportId, createdAt: new Date().toISOString(), sections, done: {} }
}

export function taskKeys(plan: Pick<StoredPlan, 'sections'>) {
  return plan.sections.flatMap((s, i) => s.tasks.map((_, j) => `${i}-${j}`)).slice(0, MAX_TASKS)
}

export function summarizePlan(plan: StoredPlan) {
  const keys = taskKeys(plan)
  const done = keys.filter((k) => plan.done[k]).length
  const open = plan.sections.flatMap((s, i) => s.tasks.filter((_, j) => !plan.done[`${i}-${j}`]))
  return { title: plan.title, done, total: keys.length, open }
}

export async function getStoredPlan(userId: string): Promise<StoredPlan | null> {
  const doc = await adminDb.collection('routines').doc(userId).get()
  return doc.exists ? (doc.data() as StoredPlan) : null
}

export async function getActivePlan(userId: string) {
  const plan = await getStoredPlan(userId)
  return plan ? summarizePlan(plan) : null
}

export async function savePlan(userId: string, plan: StoredPlan) {
  await adminDb.collection('routines').doc(userId).set(plan)
}

export async function toggleTask(userId: string, key: string, value: boolean) {
  const ref = adminDb.collection('routines').doc(userId)
  return adminDb.runTransaction(async (tx) => {
    const plan = (await tx.get(ref)).data() as StoredPlan | undefined
    if (!plan || !taskKeys(plan).includes(key)) throw new Error('Unknown task')
    tx.update(ref, { [`done.${key}`]: value })
    return summarizePlan({ ...plan, done: { ...plan.done, [key]: value } })
  })
}
