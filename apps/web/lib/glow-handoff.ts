// Hands the photo from a tool page to the plan's start scan, so a visitor who
// just bought the plan does not have to pick the same selfie again. It lives
// in sessionStorage only: gone when the tab closes, never sent anywhere until
// the visitor taps "Use this photo".

const KEY = 'aura-glow-photo'

export function saveGlowPhoto(photo: string) {
  try {
    sessionStorage.setItem(KEY, photo)
  } catch {
    /* too large or blocked: the intake simply asks for a selfie */
  }
}

export function readGlowPhoto(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const photo = sessionStorage.getItem(KEY)
    return photo && photo.startsWith('data:image/') ? photo : null
  } catch {
    return null
  }
}

export function clearGlowPhoto() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}
