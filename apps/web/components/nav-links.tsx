'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Sparkles, BadgeDollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

// TODO: Customize navigation items for your app
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/generate', label: 'Generate', Icon: Sparkles },
  { href: '/pricing', label: 'Pricing', Icon: BadgeDollarSign },
] as const

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-auto font-sans sm:gap-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-1 py-1.5 transition-colors sm:gap-2.5 sm:px-0',
              'text-base font-semibold tracking-tight sm:text-lg',
              active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                active ? 'opacity-100' : 'opacity-70',
              )}
              aria-hidden
            />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
