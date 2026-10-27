import Link from 'next/link'
import { tools } from '@/lib/tool-report'

export default function ToolsPage() {
  return (
    <>
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-fuchsia-300">
        A little clarity. A plan of your own.
      </p>
      <h1 className="max-w-3xl text-4xl font-bold sm:text-6xl">
        Find the look that feels like you.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">
        Choose a tool and a photo. Face shape, symmetry and eye geometry are measured free on your
        device. Aura Pro writes the full AI report, for every tool.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-fuchsia-400/50 hover:bg-white/[0.06]"
          >
            <p className="mb-4 text-xs uppercase tracking-wider text-fuchsia-300">
              {tool.audience === 'women' ? 'For women' : 'For your style'}
            </p>
            <h2 className="text-xl font-bold">{tool.name}</h2>
            <p className="mt-3 min-h-16 text-white/60">{tool.description}</p>
            <p className="mt-6 font-semibold">
              Start free preview <span aria-hidden>↗</span>
            </p>
          </Link>
        ))}
      </div>
    </>
  )
}
