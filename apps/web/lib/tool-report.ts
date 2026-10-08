import catalog from '../../../config/tools.json'

export const tools = catalog
export type ToolDefinition = (typeof catalog)[number]
export type ToolReport = {
  potentialScore: number
  headline: string
  sections: { title: string; text: string; tasks?: string[] }[]
  limitations: string
}
export type ToolPreview = { id: string; tool: string; potentialScore: number; unlocked: false }

export function findTool(slug: string) {
  return tools.find((tool) => tool.slug === slug)
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

// Keep validation and redaction independent of the database, so paid-data
// leakage and malformed model responses can be tested without live services.
export function parseToolReport(value: unknown): ToolReport {
  if (!value || typeof value !== 'object') throw new Error('Invalid analysis')
  const r = value as Record<string, unknown>
  if (
    r.validPhoto !== true ||
    typeof r.confidence !== 'number' ||
    !Number.isFinite(r.confidence) ||
    r.confidence < 0.6 ||
    r.confidence > 1
  ) {
    throw new Error('Please use a clear photo of one face, looking at the camera in even lighting.')
  }
  if (
    typeof r.potentialScore !== 'number' ||
    !Number.isFinite(r.potentialScore) ||
    r.potentialScore < 1 ||
    r.potentialScore > 10
  )
    throw new Error('Invalid score returned by analysis')
  if (
    !boundedText(r.headline, 180) ||
    !boundedText(r.limitations, 1200) ||
    !Array.isArray(r.sections) ||
    r.sections.length < 3 ||
    r.sections.length > 10
  )
    throw new Error('Incomplete analysis')
  const sections = r.sections.map((s) => {
    if (!s || !boundedText(s.title, 120) || !boundedText(s.text, 2500))
      throw new Error('Incomplete analysis section')
    if (
      s.tasks !== undefined &&
      (!Array.isArray(s.tasks) ||
        s.tasks.length > 12 ||
        s.tasks.some((t: unknown) => !boundedText(t, 400)))
    )
      throw new Error('Invalid task list')
    return {
      title: s.title as string,
      text: s.text as string,
      ...(s.tasks ? { tasks: s.tasks as string[] } : {})
    }
  })
  return {
    potentialScore: Math.round(r.potentialScore * 10) / 10,
    headline: r.headline,
    sections,
    limitations: r.limitations
  }
}

export function previewReport(id: string, tool: string, report: ToolReport): ToolPreview {
  return { id, tool, potentialScore: report.potentialScore, unlocked: false }
}

export function safeToolReturn(value: string | null | undefined) {
  return value && /^\/tools\/result\/[a-f0-9]{40}(?:\?checkout=1)?$/.test(value) ? value : null
}

export function isPhotoData(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 4_200_000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
}
