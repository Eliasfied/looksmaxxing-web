'use client'

import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { appConfig } from '@/lib/config'

export function OnboardingSignOutLink() {
  async function handleSignOut() {
    await signOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    window.location.href = appConfig.brand.marketingUrl
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm text-[#888888] transition-colors hover:text-white"
    >
      Sign out
    </button>
  )
}
