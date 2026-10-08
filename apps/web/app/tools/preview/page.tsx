import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ToolResult } from '../result/[id]/tool-result'
import { findTool } from '@/lib/tool-report'

export const dynamic = 'force-dynamic'

// A development-only visual fixture. It never creates a report, grants access,
// calls an AI provider or offers a functioning checkout.
export default async function PreviewPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string }>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const unlocked = (await searchParams).state === 'unlocked'
  const tool = findTool('glow-up-planner')!
  const report = {
    potentialScore: 7.4,
    headline: 'A practical routine that fits into your week.',
    sections: [
      {
        title: 'Week 1 · Make the basics easy',
        text: 'Start by choosing a simple routine you can keep. Set aside a few minutes each morning to style your hair, prepare an outfit and note what feels comfortable. This example illustrates the report format; it is not an analysis of a real person.',
        tasks: [
          'Choose a low-maintenance hairstyle to explore',
          'Put together two everyday outfits',
          'Write down one styling goal'
        ]
      },
      {
        title: 'Week 2 · Try one change',
        text: 'Focus on a single experiment, such as a different parting or an outfit combination. Keep the change small enough to compare fairly and decide whether it suits your preferences.',
        tasks: ['Try one new way to frame your face', 'Make a short note about what worked']
      },
      {
        title: 'Your daily checklist',
        text: 'Use these checkboxes to track your routine in this browser. Your real report will use your photo and the preferences you provide.',
        tasks: [
          'A few minutes for grooming',
          'Prepare tomorrow’s outfit',
          'Record one useful observation'
        ]
      }
    ],
    limitations:
      'Local demonstration with fictional content. AI styling estimates are subjective and depend on the photo.'
  }
  return (
    <>
      <div className="mb-8 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-100">
        <p>Local design preview · Fictional result · Checkout disabled</p>
        <div className="mt-2 flex gap-5">
          <Link href="/tools/preview">Locked preview</Link>
          <Link href="/tools/preview?state=unlocked">Unlocked report</Link>
          <Link href="/tools">Back to tools</Link>
        </div>
      </div>
      <div inert>
        <ToolResult
          key={unlocked ? 'unlocked' : 'locked'}
          id={'0'.repeat(40)}
          tool={tool}
          potentialScore={7.4}
          signedIn={false}
          initialReport={unlocked ? report : null}
        />
      </div>
    </>
  )
}
