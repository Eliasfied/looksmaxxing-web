'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { CreditsDisplay } from '@/components/credits-display'
import { SignOutButton } from '@/components/sign-out-button'

type AppHeaderSecondaryProps = {
  email: string
  totalCredits: number
}

export function AppHeaderSecondary({ email, totalCredits }: AppHeaderSecondaryProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Link href="/pricing" className="rounded-xl transition-opacity hover:opacity-90" title="Credits">
        <CreditsDisplay total={totalCredits} />
      </Link>

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
