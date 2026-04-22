'use client'

import { useState } from 'react'
import { Purchases } from '@revenuecat/purchases-js'
import { createClient } from '@/lib/supabase/client'
import { RotateCcw } from 'lucide-react'

export function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const purchases = Purchases.configure(
        process.env.NEXT_PUBLIC_REVENUECAT_API_KEY!,
        user.id
      )

      const info = await purchases.getCustomerInfo()
      const managementUrl = info.managementURL

      if (managementUrl) {
        window.open(managementUrl, '_blank')
      } else {
        // Fallback: RC billing portal
        window.open('https://app.revenuecat.com/manage', '_blank')
      }
    } catch (err) {
      console.error('[CancelSubscription]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl border border-[#333333] bg-black py-3 text-sm font-medium text-[#888888] transition-colors hover:border-[#555555] hover:text-white disabled:opacity-50"
    >
      {loading
        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        : <RotateCcw className="h-4 w-4" />}
      Cancel Subscription
    </button>
  )
}
