'use client'

import posthog from 'posthog-js'
import { Download } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        posthog.capture('glow_plan_pdf')
        window.print()
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white"
    >
      <Download className="h-4 w-4" aria-hidden /> Download PDF
    </button>
  )
}
