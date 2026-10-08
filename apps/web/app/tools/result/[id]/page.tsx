import { notFound } from 'next/navigation'
import { accessReport } from '@/lib/tool-store'
import { findTool } from '@/lib/tool-report'
import { ToolResult } from './tool-result'

export const dynamic = 'force-dynamic'
export default async function ResultPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ checkout?: string }>
}) {
  const { id } = await params
  const access = await accessReport(id)
  if (!access) notFound()
  const tool = findTool(access.payload.tool)
  if (!tool) notFound()
  // Never serialize the full report into the RSC payload while locked.
  return (
    <ToolResult
      key={id + String(access.unlocked) + String(Boolean(access.user))}
      id={id}
      tool={tool}
      potentialScore={access.payload.report.potentialScore}
      signedIn={Boolean(access.user)}
      checkoutRequested={(await searchParams).checkout === '1'}
      initialReport={access.unlocked ? access.payload.report : null}
    />
  )
}
