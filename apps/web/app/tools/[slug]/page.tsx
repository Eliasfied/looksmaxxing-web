import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { findTool } from '@/lib/tool-report'
import { ToolUpload } from './tool-upload'

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const tool = findTool((await params).slug)
  if (!tool) notFound()
  return (
    <Suspense>
      <ToolUpload tool={tool} />
    </Suspense>
  )
}
