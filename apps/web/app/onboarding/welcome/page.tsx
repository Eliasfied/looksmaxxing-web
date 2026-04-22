import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function WelcomePage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl btn-gradient shadow-2xl">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-3">You&apos;re all set!</h1>
        <p className="text-[#888] text-base mb-10">
          You are ready to create anything you can imagine.
        </p>

        <Link
          href="/dashboard"
          className="btn-gradient inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Sparkles className="h-5 w-5" />
          Start generating
        </Link>

        <p className="mt-6 text-xs text-[#444]">
          Credits not showing up?{' '}
          <span className="text-[#666]">They may take a few seconds. Try refreshing the page.</span>
        </p>
      </div>
    </div>
  )
}
