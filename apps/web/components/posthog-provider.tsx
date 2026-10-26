'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      // Uploaded photos, preferences and paid report contents must not enter recordings.
      disable_session_recording: true,
      autocapture: false,
    })
  }, [])

  return (
    <Suspense>
      <PageViewTracker>{children}</PageViewTracker>
    </Suspense>
  )
}

function PageViewTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // The marketing site tags every tool link with the page it came from, but
    // the parameter is gone by the time someone reaches the report and pays.
    // Registering it makes every later event in the session carry the origin,
    // so a purchase can be traced back to the article that produced it.
    const source = searchParams.get('source')
    if (source && source.startsWith('/') && !source.startsWith('//')) {
      posthog.register({ aura_source: source })
    }
    posthog.capture('$pageview', { $current_url: window.location.href })
  }, [pathname, searchParams])

  return <>{children}</>
}
