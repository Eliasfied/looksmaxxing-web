import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/settings', '/credits', '/pricing', '/onboarding']
const AUTH_ONLY = ['/login', '/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('__session')?.value

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r))
  const isAuthOnly = AUTH_ONLY.some((r) => pathname.startsWith(r))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthOnly && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|api).*)'],
}
