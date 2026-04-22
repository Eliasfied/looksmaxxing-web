'use client'

import { Zap } from 'lucide-react'

interface CreditsDisplayProps {
  total: number
}

export function CreditsDisplay({ total }: CreditsDisplayProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full btn-gradient px-1 py-1 pr-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
        <Zap className="h-3.5 w-3.5 fill-white text-white" />
      </div>
      <span className="text-xs font-bold leading-none text-white">{total.toLocaleString()}</span>
    </div>
  )
}
