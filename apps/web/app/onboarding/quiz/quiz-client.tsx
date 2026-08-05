'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, ScanFace, MessageCircle, Wand2, ShieldCheck } from 'lucide-react'
import type { FaceScan } from '@/lib/firebase/scans'
import posthog from 'posthog-js'

interface Question {
  key: string
  title: string
  subtitle?: string
  options: { value: string; label: string; hint?: string }[]
}

const QUESTIONS: Question[] = [
  {
    key: 'gender',
    title: 'What best describes you?',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Prefer not to say' },
    ],
  },
  {
    key: 'age',
    title: 'How old are you?',
    subtitle: 'Bone structure and skin respond differently at every age.',
    options: [
      { value: 'under_18', label: 'Under 18' },
      { value: '18_24', label: '18 – 24' },
      { value: '25_34', label: '25 – 34' },
      { value: '35_plus', label: '35+' },
    ],
  },
  {
    key: 'goal',
    title: "What's your main goal?",
    options: [
      { value: 'jawline', label: 'Sharper jawline', hint: 'Gonial angle, mewing, body fat' },
      { value: 'skin', label: 'Clearer skin', hint: 'Texture, tone, routine' },
      { value: 'hair', label: 'Better hair & hairline', hint: 'Styling, density, framing' },
      { value: 'overall', label: 'Overall glow-up', hint: 'Everything combined' },
    ],
  },
  {
    key: 'concern',
    title: 'What bothers you most right now?',
    options: [
      { value: 'face_shape', label: 'My face shape' },
      { value: 'eye_area', label: 'My eye area' },
      { value: 'skin_quality', label: 'My skin quality' },
      { value: 'not_sure', label: "I'm not sure — that's why I'm here" },
    ],
  },
  {
    key: 'experience',
    title: 'How much do you know about looksmaxxing?',
    options: [
      { value: 'beginner', label: 'Complete beginner' },
      { value: 'some', label: 'I know the basics' },
      { value: 'advanced', label: 'I know my PSL terms' },
    ],
  },
  {
    key: 'timeBudget',
    title: 'How much time can you invest daily?',
    subtitle: 'Your plan gets built around this.',
    options: [
      { value: '5_min', label: '5 minutes' },
      { value: '15_min', label: '15 minutes' },
      { value: '30_plus', label: '30+ minutes' },
    ],
  },
]

const GOAL_COPY: Record<string, { focus: string; detail: string }> = {
  jawline: {
    focus: 'jawline definition',
    detail: 'We measure your gonial angle, midface ratio and cheekbone projection — the three metrics that decide how sharp your jaw reads.',
  },
  skin: {
    focus: 'skin quality',
    detail: 'We score your skin clarity, tone evenness and texture, then build a routine around what your face actually needs.',
  },
  hair: {
    focus: 'hair and hairline',
    detail: 'We check your hairline depth against the Norwood scale and match hairstyles to your measured face shape.',
  },
  overall: {
    focus: 'overall harmony',
    detail: 'We score all nine facial metrics and show you which one is holding your score back the most.',
  },
}

const TOTAL_STEPS = QUESTIONS.length + 4

export function QuizClient() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [image, setImage] = useState<string | null>(null)
  const [scan, setScan] = useState<FaceScan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => setImage(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  function selectAnswer(key: string, value: string) {
    const next = { ...answers, [key]: value }
    setAnswers(next)

    if (step === QUESTIONS.length - 1) {
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {})
      posthog.capture('onboarding_quiz_completed', next)
    }
    setStep(s => s + 1)
  }

  async function runScan() {
    if (!image) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed. Please try again.')
        return
      }
      posthog.capture('onboarding_scan_completed')
      setScan(data.scan)
      setStep(s => s + 1)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {step < QUESTIONS.length && (
        <QuestionStep
          question={QUESTIONS[step]}
          selected={answers[QUESTIONS[step].key]}
          onSelect={selectAnswer}
        />
      )}

      {step === QUESTIONS.length && (
        <ExplanationStep goal={answers.goal} onNext={() => setStep(s => s + 1)} />
      )}

      {step === QUESTIONS.length + 1 && (
        <FeaturesStep onNext={() => setStep(s => s + 1)} />
      )}

      {step === QUESTIONS.length + 2 && (
        <ScanStep
          image={image}
          loading={loading}
          error={error}
          inputRef={inputRef}
          onFile={handleFile}
          onClear={() => setImage(null)}
          onAnalyze={runScan}
        />
      )}

      {step === QUESTIONS.length + 3 && scan && (
        <RevealStep scan={scan} onUnlock={() => router.push(`/dashboard/${scan.id}`)} />
      )}
    </div>
  )
}

function QuestionStep({
  question,
  selected,
  onSelect,
}: {
  question: Question
  selected?: string
  onSelect: (key: string, value: string) => void
}) {
  return (
    <div>
      <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">{question.title}</h1>
      {question.subtitle && <p className="mt-2 text-sm text-[#777]">{question.subtitle}</p>}

      <div className="mt-8 flex flex-col gap-3">
        {question.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(question.key, opt.value)}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              selected === opt.value
                ? 'border-purple-500/60 bg-purple-500/10'
                : 'border-white/10 bg-white/[0.02] hover:border-purple-500/40 hover:bg-white/[0.04]'
            }`}
          >
            <p className="text-sm font-bold text-white">{opt.label}</p>
            {opt.hint && <p className="mt-1 text-xs text-[#666]">{opt.hint}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExplanationStep({ goal, onNext }: { goal?: string; onNext: () => void }) {
  const copy = GOAL_COPY[goal ?? 'overall'] ?? GOAL_COPY.overall
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Here&apos;s how it works</p>
      <h1 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">
        We&apos;ll measure your face against{' '}
        <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
          9 objective metrics
        </span>
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[#888]">
        Your PSL score rates facial attractiveness from 1 to 10. Most people land between 4 and 6 — the
        score itself matters less than knowing <em>which</em> features are pulling it down.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[#888]">
        Since you picked <span className="font-semibold text-white">{copy.focus}</span>: {copy.detail}
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
          <p className="text-xs leading-relaxed text-[#777]">
            Your photo is analyzed once and never shared. You can delete your scans at any time.
          </p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="btn-gradient mt-8 w-full rounded-full py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Continue
      </button>
    </div>
  )
}

const FEATURES = [
  { icon: ScanFace, title: 'Full face analysis', body: '9 metrics scored, with what each one means for you.' },
  { icon: Wand2, title: 'Hairstyle try-on', body: 'See yourself with cuts matched to your face shape.' },
  { icon: MessageCircle, title: 'AI looksmaxxing coach', body: 'Ask anything — it knows your scan results.' },
  { icon: Sparkles, title: 'Personalized glow-up plan', body: 'Concrete steps ranked by impact on your score.' },
]

function FeaturesStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">What you get</h1>

      <div className="mt-8 flex flex-col gap-3">
        {FEATURES.map(f => (
          <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
              <f.icon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#666]">{f.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-transparent p-6 text-center">
        <div className="flex items-baseline justify-center gap-8">
          <div>
            <p className="text-2xl font-black text-white">9</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#666]">Metrics scored</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">~20s</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#666]">To results</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">$0</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#666]">To start</p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="btn-gradient mt-8 w-full rounded-full py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Start my free scan
      </button>
    </div>
  )
}

function ScanStep({
  image,
  loading,
  error,
  inputRef,
  onFile,
  onClear,
  onAnalyze,
}: {
  image: string | null
  loading: boolean
  error: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onFile: (file: File) => void
  onClear: () => void
  onAnalyze: () => void
}) {
  return (
    <div>
      <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">Upload a frontal photo</h1>
      <p className="mt-2 text-sm text-[#777]">Face the camera directly, good lighting, neutral expression.</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />

      <div className="mt-8">
        {!image ? (
          <div
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) onFile(f)
            }}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 p-16 text-center transition-colors hover:border-purple-500/40"
          >
            <ScanFace className="mx-auto mb-3 h-10 w-10 text-[#444]" />
            <p className="text-sm font-semibold text-white">Tap to upload</p>
            <p className="mt-1 text-xs text-[#555]">JPG or PNG</p>
          </div>
        ) : (
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Preview" className="h-full w-full object-cover" />
            <button
              onClick={onClear}
              className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

      <button
        onClick={onAnalyze}
        disabled={!image || loading}
        className="btn-gradient mt-8 w-full rounded-full py-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Analyzing your face…' : 'Analyze my face — free'}
      </button>
      <p className="mt-3 text-center text-xs text-[#444]">Your first scan is free · No card required</p>
    </div>
  )
}

function pslColor(score: number) {
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6) return 'text-yellow-400'
  if (score >= 4.5) return 'text-orange-400'
  return 'text-red-400'
}

const TEASER_ROWS = ['Bone Structure', 'Eye Area', 'Skin & Hair', 'Symmetry']

function RevealStep({ scan, onUnlock }: { scan: FaceScan; onUnlock: () => void }) {
  const gain = (scan.potentialPslScore - scan.overallPslScore).toFixed(1)

  return (
    <div>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-purple-400">Your result</p>

      <div className="mt-6 flex items-end justify-center gap-8">
        <div className="text-center">
          <span className={`text-7xl font-black ${pslColor(scan.overallPslScore)}`}>
            {scan.overallPslScore.toFixed(1)}
          </span>
          <p className="mt-1 text-xs text-[#555]">Your PSL score</p>
        </div>
        <div className="pb-3 text-center">
          <span className="text-4xl font-black text-fuchsia-400">{scan.potentialPslScore.toFixed(1)}</span>
          <p className="mt-1 text-xs text-[#555]">Your potential</p>
        </div>
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-[#888]">
        You have <span className="font-bold text-white">+{gain} points</span> of realistic upside. Your full
        breakdown shows exactly which features are holding you back.
      </p>

      <div className="relative mt-8">
        <div className="pointer-events-none select-none space-y-3 blur-md" aria-hidden="true">
          {TEASER_ROWS.map((label, i) => (
            <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-[#777]">{label}</span>
                <span className="font-semibold text-[#aaa]">{62 + i * 7}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
                  style={{ width: `${62 + i * 7}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-black/80 px-4 py-2">
            <Lock className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-bold text-white">9 metrics locked</span>
          </div>
        </div>
      </div>

      <button
        onClick={onUnlock}
        className="btn-gradient mt-8 w-full rounded-full py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Unlock my full analysis
      </button>
      <p className="mt-3 text-center text-xs text-[#444]">One-time from $2.99 · No subscription required</p>
    </div>
  )
}
