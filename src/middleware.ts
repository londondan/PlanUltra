import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req: NextRequest & { auth: unknown }) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isPublicRoute =
    nextUrl.pathname === '/' ||
    nextUrl.pathname.startsWith('/auth') ||
    nextUrl.pathname.startsWith('/api/auth') ||
    nextUrl.pathname.startsWith('/crew')

  const isGuestCookie = req.cookies.get('pua_guest')?.value === '1'
  if (!isPublicRoute && !isLoggedIn && !isGuestCookie) {
    return NextResponse.redirect(new URL('/auth/signin', nextUrl))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
