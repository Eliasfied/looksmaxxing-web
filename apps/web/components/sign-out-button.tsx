'use client'

import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { cn } from '@/lib/utils'

type SignOutButtonProps = {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter()

  async function handleSignOut() {
    await signOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        'rounded-lg px-3 py-2 text-left text-sm text-[#888888] transition-colors hover:bg-white/5 hover:text-white',
        className
      )}
    >
      Sign out
    </button>
  )
}
