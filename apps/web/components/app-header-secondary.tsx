'use client'

import Link from 'next/link'
import { Settings, Sparkles } from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'

type AppHeaderSecondaryProps = {
  email: string
  pro: boolean
  tryOnsLeft: number
}

export function AppHeaderSecondary({ email, pro, tryOnsLeft }: AppHeaderSecondaryProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {pro ? (
        <Link
          href="/studio"
          title="Try-on looks left this month"
          className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-bold text-fuchsia-100"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Pro · {tryOnsLeft}
        </Link>
      ) : (
        <Link href="/pricing" className="btn-gradient rounded-full px-4 py-2 text-xs font-bold text-white transition hover:brightness-110">
          Get Pro
        </Link>
      )}

      <Link
        href="/settings"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#a3a3a3] transition-colors hover:bg-white/5 hover:text-white"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
        <span className="sr-only">Settings</span>
      </Link>

      <span className="hidden max-w-[160px] truncate text-sm text-[#737373] lg:inline">{email}</span>

      <SignOutButton className="hidden px-3 py-2 text-sm font-semibold sm:inline-flex" />
    </div>
  )
}
