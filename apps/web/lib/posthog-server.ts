// Server-side events for PostHog, for facts the browser cannot be trusted to
// report: a verified sale arrives from the billing webhook even when the
// buyer's browser blocked tracking or closed the tab during checkout.

/**
 * Sends one event. Never throws and gives up after 3 seconds: analytics must
 * not hold up or fail the billing webhook. Only runs in production, like the
 * browser SDK, so local tests do not pollute the project.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>,
  options: { uuid?: string; timestamp?: string } = {}
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || process.env.NODE_ENV !== 'production') return false
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com').replace(/\/+$/, '')
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: 'aura-server' },
        ...(options.uuid ? { uuid: options.uuid } : {}),
        ...(options.timestamp ? { timestamp: options.timestamp } : {})
      }),
      signal: AbortSignal.timeout(3000)
    })
    return res.ok
  } catch {
    return false
  }
}
