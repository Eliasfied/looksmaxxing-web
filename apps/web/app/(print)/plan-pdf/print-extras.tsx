import { MILESTONES, PLAN_DAYS, workoutForDay, type GlowPlanContent } from '@/lib/glow-plan'
import { GUIDES } from '@/lib/glow-guides'

// The pages people actually print: a tick-off tracker for all 30 days, weekly
// check-in sheets, and the men's or women's reference guide.

function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <header className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-700">{eyebrow}</p>
      <h2 className="text-2xl font-black text-black">{title}</h2>
      {text && <p className="mt-1 text-sm text-neutral-600">{text}</p>}
    </header>
  )
}

const WriteIn = () => <span className="block h-4" />
const Box = () => <span className="mx-auto block h-4 w-4 rounded-[3px] border border-neutral-500" />
const Off = () => <span className="block text-center text-neutral-300">–</span>

type Row = { label: string; cell: (day: number) => React.ReactNode; tint?: boolean }

function TrackerTable({ rows, from, to, dateOf }: { rows: Row[]; from: number; to: number; dateOf: (d: number) => string }) {
  const days = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  return (
    <table className="w-full table-fixed border-collapse text-[10px] leading-tight">
      <colgroup>
        <col className="w-[46mm]" />
        {days.map((d) => (
          <col key={d} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="border border-neutral-300 bg-neutral-100 p-1 text-left print:[print-color-adjust:exact]">Day</th>
          {days.map((d) => (
            <th
              key={d}
              className={`border border-neutral-300 p-0.5 text-center print:[print-color-adjust:exact] ${MILESTONES[d] ? 'bg-fuchsia-100' : 'bg-neutral-100'}`}
            >
              <span className="block text-[11px] font-black">{d}</span>
              <span className="block text-[8px] font-normal text-neutral-500">{dateOf(d)}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.tint ? 'bg-neutral-50 print:[print-color-adjust:exact]' : undefined}>
            <td className="border border-neutral-300 p-1.5 font-semibold">{row.label}</td>
            {days.map((d) => (
              <td key={d} className="h-9 border border-neutral-300 p-0.5 align-middle">
                {row.cell(d)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const short = (text: string, max = 46) => (text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text)

export function TrackerPages({ plan, dateOf }: { plan: GlowPlanContent; dateOf: (d: number) => string }) {
  const rows: Row[] = [
    { label: 'Morning routine', cell: () => <Box /> },
    { label: 'Evening routine', cell: () => <Box /> },
    { label: 'Today’s task(s) from the plan', cell: (d) => (plan.days[d - 1]?.tasks.length || MILESTONES[d] ? <Box /> : <Off />) },
    ...(plan.workouts.length ? [{ label: 'Workout', cell: (d: number) => (workoutForDay(plan, d) ? <Box /> : <Off />) }] : []),
    ...plan.habits.map((h) => ({ label: short(h.text), cell: () => <Box /> })),
    { label: 'Progress photo', cell: (d: number) => ([1, 7, 14, 21, 30].includes(d) ? <Box /> : <Off />) },
    { label: 'Sleep (hours)', cell: () => <WriteIn />, tint: true },
    { label: 'Energy 1–5', cell: () => <WriteIn />, tint: true },
    { label: 'Skin feels 1–5', cell: () => <WriteIn />, tint: true }
  ]
  const half = Math.ceil(PLAN_DAYS / 2)
  return (
    <>
      {[
        [1, half],
        [half + 1, PLAN_DAYS]
      ].map(([from, to], i) => (
        <section key={from} className="page-break pt-2 print:pt-0">
          <PageTitle
            eyebrow={`Print & tick off · page ${i + 1} of 2`}
            title={`30-day tracker · days ${from}–${to}`}
            text="Tick each box when it is done. Write sleep, energy and skin in the shaded rows. Pink days are photo and check-in days."
          />
          {i === 0 && (
            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <p className="border-b border-neutral-400 pb-5">
                <b>My goal for day 30:</b>
              </p>
              <p className="border-b border-neutral-400 pb-5">
                <b>Why it matters to me:</b>
              </p>
            </div>
          )}
          <TrackerTable rows={rows} from={from} to={to} dateOf={dateOf} />
          <p className="mt-3 text-[10px] text-neutral-500">
            Missed a day? Do not try to catch up twice. Pick the plan up again tomorrow; a 70 % week still moves you forward.
          </p>
        </section>
      ))}
    </>
  )
}

const Lines = ({ n }: { n: number }) => (
  <span className="block">
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className="block h-6 border-b border-neutral-300" />
    ))}
  </span>
)

const Scale = ({ label }: { label: string }) => (
  <p className="flex items-center justify-between gap-2 text-sm">
    <span>{label}</span>
    <span className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-400 text-[10px]">
          {n}
        </span>
      ))}
    </span>
  </p>
)

export function CheckInPages({ dateOf }: { dateOf: (d: number) => string }) {
  const checkIns: [number, string][] = [
    [7, 'Week 1 check-in'],
    [14, 'Halfway check-in'],
    [21, 'Week 3 check-in'],
    [30, 'Day 30: before & after']
  ]
  return (
    <section className="page-break pt-2 print:pt-0">
      <PageTitle
        eyebrow="Print & fill in"
        title="Weekly check-ins"
        text="Five minutes on each check-in day. Honest answers make the next week better than the last."
      />
      <div className="grid grid-cols-2 gap-4">
        {checkIns.map(([day, title]) => (
          <div key={day} className="avoid rounded-xl border border-neutral-300 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-700">
              Day {day} · {dateOf(day)}
            </p>
            <p className="text-lg font-black">{title}</p>
            <p className="mt-2 text-sm">☐ Progress photo taken (same spot, same light)</p>
            <div className="mt-2 space-y-1.5">
              <Scale label="Skin" />
              <Scale label="Hair & grooming" />
              <Scale label="Energy & sleep" />
              <Scale label="How I feel about how I look" />
            </div>
            <p className="mt-3 text-xs font-bold">{day === 30 ? 'Biggest change since day 1:' : 'What went well:'}</p>
            <Lines n={2} />
            <p className="mt-2 text-xs font-bold">{day === 30 ? 'What I keep doing from now on:' : 'What I skipped most, and why:'}</p>
            <Lines n={2} />
            {day !== 30 && (
              <>
                <p className="mt-2 text-xs font-bold">One thing I change next week:</p>
                <Lines n={1} />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function GuidePages({ audience }: { audience: 'men' | 'women' }) {
  const guide = GUIDES[audience]
  return (
    <section className="page-break pt-2 print:pt-0">
      <PageTitle eyebrow="Your guide" title={guide.title} text={guide.subtitle} />
      <div className="columns-2 gap-6">
        {guide.sections.map((s) => (
          <div key={s.title} className="avoid mb-5 break-inside-avoid">
            <h3 className="border-b-2 border-fuchsia-600 pb-0.5 text-base font-black text-black">{s.title}</h3>
            <p className="mt-1.5 text-xs text-neutral-600">{s.intro}</p>
            <ul className="mt-1.5 space-y-1 text-xs leading-relaxed">
              {s.points.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <span className="text-fuchsia-700">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
