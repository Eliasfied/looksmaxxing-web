import posthog from 'posthog-js'

/**
 * Records a finished sign-up or sign-in and links this browser's anonymous
 * visitor to the account, so the tool page they came from, the checkout and
 * the verified sale from the billing webhook all land on one person.
 * Only the account id is sent, never the email.
 */
export function trackAuth(kind: 'signup' | 'login', method: 'google' | 'email', uid: string, from: 'register' | 'login') {
  if (posthog.get_distinct_id() !== uid) posthog.identify(uid)
  posthog.capture(kind, { method, from })
}
