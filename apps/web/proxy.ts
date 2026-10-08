import { NextResponse, type NextRequest } from 'next/server'


const PROTECTED = ['/dashboard', '/settings', '/credits', '/pricing', '/onboarding']


export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('__session')?.value

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // A cookie's presence does not prove it is valid. Keep sign-in reachable
  // so expired sessions cannot create a report -> login redirect loop.

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|api).*)'],
}
