'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'What hairstyle suits my face shape?',
  'How can I improve my jawline?',
  'What skincare routine do you recommend?',
  'How do I get hunter eyes?',
]

interface Props {
  hasScan: boolean
}

export function ChatClient({ hasScan }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.error ?? 'Something went wrong. Please try again.' },
        ])
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please check your connection.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-white tracking-tight">AI Looksmaxxing Coach</h1>
        <p className="text-[#666] text-sm mt-1">
          {hasScan
            ? 'Personalized advice based on your face scan'
            : 'Chat with your AI coach — run a face scan for personalized advice'}
        </p>
      </div>

      {!hasScan && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 px-4 py-3">
          <span className="text-lg">📸</span>
          <p className="text-sm text-[#aaa]">
            No scan detected.{' '}
            <Link href="/dashboard" className="text-fuchsia-400 hover:underline">
              Run a face scan
            </Link>{' '}
            to get personalized advice.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.015] p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4">🧬</div>
            <p className="text-sm text-[#555] mb-6">Ask anything about looksmaxxing, grooming, or your face.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left text-xs text-[#777] hover:text-white hover:border-purple-500/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white rounded-br-sm'
                  : 'bg-white/[0.04] border border-white/5 text-[#ccc] rounded-bl-sm'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.04] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#555] animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#555] animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#555] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your looksmaxxing coach…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-purple-500/50 transition-colors max-h-32"
          style={{ minHeight: '48px' }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 p-3 text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
