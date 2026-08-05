import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function InsufficientCreditsPrompt({ required }: { required?: number }) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 text-center">
      <p className="text-sm font-semibold text-white">
        {required ? `You need ${required} credits for this` : 'You are out of credits'}
      </p>
      <p className="mt-1 text-xs text-[#888]">Top up once from $2.99 — no subscription needed.</p>
      <Link
        href="/pricing"
        className="btn-gradient mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        <Sparkles className="h-4 w-4" />
        Get credits
      </Link>
    </div>
  )
}
