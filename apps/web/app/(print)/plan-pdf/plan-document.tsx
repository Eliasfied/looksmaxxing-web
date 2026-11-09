import { AREA_LABELS, MILESTONES, PLAN_DAYS, workoutForDay, type GlowPlanContent } from '@/lib/glow-plan'
import { TRYON_CATALOG } from '@/lib/tryon-catalog'
import { appConfig } from '@/lib/config'
import { GUIDES } from '@/lib/glow-guides'
import { PrintButton } from './print-button'
import { CheckInPages, GuidePages, TrackerPages } from './print-extras'

const lookLabel = (type: string, id: string) =>
  TRYON_CATALOG.find((c) => c.type === type)?.options.find((o) => o.id === id)?.label ?? id

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 border-b-2 border-fuchsia-600 pb-1 text-xl font-black text-black">{children}</h2>
}

/** The whole plan on A4 pages; shared by the PDF page and its preview. */
export function PlanDocument({
  plan,
  startedAt,
  audience
}: {
  plan: GlowPlanContent
  startedAt: string
  audience: 'men' | 'women'
}) {
  const start = new Date(startedAt)
  const dateOf = (day: number) =>
    new Date(start.getTime() + (day - 1) * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-neutral-200 py-8 text-neutral-900 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { html, body { background: #fff !important; } .page-break { break-before: page; } .avoid { break-inside: avoid; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <a href="/glow-up" className="text-sm font-semibold text-neutral-700">← Back to my plan</a>
        <span className="flex items-center gap-3"><span className="hidden text-xs text-neutral-600 sm:inline">Pick “Save as PDF” as the printer.</span><PrintButton /></span>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-[14mm] shadow-xl print:max-w-none print:p-0 print:shadow-none">
        <header className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 p-6 text-white print:[print-color-adjust:exact]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{appConfig.brand.shortName} · 30-Day Glow-Up Plan</p>
          <h1 className="mt-2 text-3xl font-black">{plan.headline}</h1>
          <p className="mt-2 text-sm opacity-90">
            Started {start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Day 30 on {dateOf(PLAN_DAYS)}
          </p>
          <p className="mt-3 text-xs opacity-80">
            Inside: your plan · your 30 days · {GUIDES[audience].title.replace(/^The /, 'the ')} · printable 30-day tracker · weekly check-ins
          </p>
        </header>
        {plan.summary && <p className="mt-5 leading-relaxed">{plan.summary}</p>}

        {plan.focus.length > 0 && (
          <>
            <H2>Your focus areas</H2>
            <div className="grid grid-cols-2 gap-3">
              {plan.focus.map((f) => (
                <div key={f.title} className="avoid rounded-xl border border-neutral-300 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-700">{AREA_LABELS[f.area]}</p>
                  <p className="font-bold">{f.title}</p>
                  <p className="mt-1 text-sm text-neutral-600">{f.finding}</p>
                  {f.goal && <p className="mt-1 text-sm"><b>Goal:</b> {f.goal}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-6">
          {[
            ['Morning routine', plan.morning],
            ['Evening routine', plan.evening]
          ].map(([title, steps]) => (
            <div key={title as string} className="avoid">
              <H2>{title as string}</H2>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                {(steps as GlowPlanContent['morning']).map((s, i) => (
                  <li key={i}>
                    <b>{s.step}</b>
                    {s.detail && <span className="text-neutral-600"> — {s.detail}</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="avoid">
          <H2>Every day</H2>
          <ul className="space-y-1.5 text-sm">
            {plan.habits.map((h) => (
              <li key={h.id}>
                ☐ <b>{h.text}</b> <span className="text-neutral-600">— {h.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {plan.workouts.length > 0 && (
          <div className="avoid">
            <H2>Training · {plan.trainingDays}× a week</H2>
            <ul className="space-y-2 text-sm">
              {plan.workouts.map((w) => (
                <li key={w.title}>
                  <b>{w.title}</b>
                  <br />
                  <span className="text-neutral-600">{w.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.products.length > 0 && (
          <div className="avoid">
            <H2>What to buy</H2>
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[38mm]" />
                <col />
              </colgroup>
              <tbody>
                {plan.products.map((p, i) => (
                  <tr key={i} className="border-b border-neutral-200 align-top">
                    <td className="py-1.5 pr-3 font-bold">{p.type}</td>
                    <td className="py-1.5 text-neutral-700">
                      {p.lookFor}
                      {p.budget && <span className="mt-0.5 block text-xs text-neutral-500">{p.budget}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="page-break" />
        <H2>Your 30 days</H2>
        <p className="mb-3 text-sm text-neutral-600">Morning routine, evening routine and the daily habits every day, plus:</p>
        <table className="w-full text-left text-sm">
          <tbody>
            {plan.days.map((d) => {
              const workout = workoutForDay(plan, d.day)
              return (
                <tr key={d.day} className="avoid border-b border-neutral-200 align-top">
                  <td className="w-16 py-2 pr-2">
                    <b>Day {d.day}</b>
                    <br />
                    <span className="text-xs text-neutral-500">{dateOf(d.day)}</span>
                  </td>
                  <td className="py-2">
                    <p className="font-semibold">{d.title}</p>
                    <ul className="text-neutral-700">
                      {MILESTONES[d.day] && <li>☐ ⚑ {MILESTONES[d.day]}</li>}
                      {d.tasks.map((t, i) => (
                        <li key={i}>☐ {t.text}</li>
                      ))}
                      {workout && <li>☐ {workout.title}</li>}
                    </ul>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="avoid">
          <H2>Looks to try</H2>
          <p className="text-sm">
            {[
              ...plan.looks.hair.map((id) => lookLabel('hair', id)),
              ...(plan.looks.beard ? [lookLabel('beard', plan.looks.beard)] : []),
              ...(plan.looks.glasses ? [lookLabel('glasses', plan.looks.glasses)] : []),
              ...(plan.looks.color ? [lookLabel('color', plan.looks.color)] : [])
            ].join(' · ') || 'Open the try-on studio in the app.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="avoid">
            <H2>What to expect</H2>
            <ul className="space-y-1.5 text-sm">
              {plan.expectations.map((e) => (
                <li key={e.when}>
                  <b>{e.when}:</b> {e.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="avoid">
            <H2>Honest limits</H2>
            <ul className="space-y-1.5 text-sm text-neutral-700">
              {plan.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>

        <GuidePages audience={audience} />
        <TrackerPages plan={plan} dateOf={dateOf} />
        <CheckInPages dateOf={dateOf} />

        <p className="mt-10 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
          AI-generated suggestions based on one photo and your answers. Not medical advice. For skin conditions, hair loss or health
          questions, talk to a dermatologist or doctor. {appConfig.brand.appUrl}
        </p>
      </article>
    </div>
  )
}
