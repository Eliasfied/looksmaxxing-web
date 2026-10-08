// Calendar-month anniversaries, clamped for dates such as January 31.
export function creditCycleStart(start: string, end: string | null, now = Date.now()) {
  const anchor = new Date(start),
    expiry = end ? Date.parse(end) : NaN
  if (
    !Number.isFinite(anchor.getTime()) ||
    !Number.isFinite(expiry) ||
    now < anchor.getTime() ||
    now >= expiry
  )
    return null
  const current = new Date(now)
  let months =
    (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    current.getUTCMonth() -
    anchor.getUTCMonth()
  const anniversary = (offset: number) => {
    const lastDay = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset + 1, 0)
    ).getUTCDate()
    return Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + offset,
      Math.min(anchor.getUTCDate(), lastDay),
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds()
    )
  }
  if (anniversary(months) > now) months--
  return anniversary(months)
}
