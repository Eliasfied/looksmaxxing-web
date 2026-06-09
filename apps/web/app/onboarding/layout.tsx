import Image from 'next/image'
import Link from 'next/link'
import { appConfig } from '@/lib/config'
import { OnboardingSignOutLink } from './sign-out-link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="relative flex items-center justify-center h-16 border-b border-[#111]">
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
          <Image src="/logo.png" alt={appConfig.brand.name} width={28} height={28} className="rounded-lg" />
          {appConfig.brand.name}
        </Link>
        <div className="absolute right-4">
          <OnboardingSignOutLink />
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
