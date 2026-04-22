import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCredits } from '@/lib/supabase/credits'
import { SignOutButton } from '@/components/sign-out-button'
import { CreditsDisplay } from '@/components/credits-display'
import { NavLinks } from '@/components/nav-links'
import { AppHeaderSecondary } from '@/components/app-header-secondary'
import { PostHogIdentify } from '@/components/posthog-identify'
import { appConfig } from '@/lib/config'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const balance = await getCredits(user.id)

  return (
    <>
    <PostHogIdentify userId={user.id} email={user.email ?? ''} />
    <div className="flex min-h-screen flex-col overflow-hidden bg-black">
      <header className="flex min-h-16 shrink-0 items-center gap-4 border-b border-[#222222] bg-black py-2 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <Image src="/logo.png" alt={appConfig.brand.name} width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-white sm:text-xl">{appConfig.brand.name}</span>
        </Link>

        <NavLinks />

        <AppHeaderSecondary email={user.email ?? ''} totalCredits={balance.total_credits} />
      </header>

      <main className="min-h-0 flex-1 overflow-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
    </>
  )
}
