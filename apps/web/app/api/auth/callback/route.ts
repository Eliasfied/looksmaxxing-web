import { NextResponse } from 'next/server'

// This route is no longer used – Firebase handles OAuth internally via signInWithPopup.
// Kept as a stub to avoid 404s from any cached links.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/dashboard`)
}
