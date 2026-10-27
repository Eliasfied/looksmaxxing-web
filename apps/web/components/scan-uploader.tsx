'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { Camera } from 'lucide-react'
import { preparePhoto } from '@/lib/prepare-photo'

/** Pro face scan: pick a selfie, get the full PSL breakdown. */
export function ScanUploader({ label = 'New face scan' }: { label?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function scan(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const imageBase64 = await preparePhoto(file)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed. Please try again.')
      posthog.capture('face_scan_completed')
      router.push(`/dashboard/${data.scan.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
      setBusy(false)
    }
  }

  return (
    <div>
      <label
        className={`btn-gradient inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <Camera className="h-4 w-4" aria-hidden />
        {busy ? 'Analyzing your face…' : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => void scan(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
