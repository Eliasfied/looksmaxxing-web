import Link from 'next/link'
import { appConfig } from '@/lib/config'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08070d] text-white">
      <header className="border-b border-white/10 px-5 py-5">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-4"
          aria-label="Tools navigation"
        >
          <Link href="/tools" className="text-xl font-bold tracking-tight">
            Aura<span className="text-fuchsia-400">.</span>
          </Link>
          <div className="flex gap-4 text-sm text-white/70">
            <Link href="/tools">Tools</Link>
            <Link href="/dashboard">My reports</Link>
            <a href={`${appConfig.brand.marketingUrl}/pricing`}>Pricing</a>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">{children}</main>
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-5 px-5 py-8 text-sm text-white/50">
        <a href={`${appConfig.brand.marketingUrl}/privacy`}>Privacy</a>
        <a href={`${appConfig.brand.marketingUrl}/terms`}>Terms</a>
        <span>Photo-based AI suggestions, not a medical assessment.</span>
      </footer>
    </div>
  )
}
