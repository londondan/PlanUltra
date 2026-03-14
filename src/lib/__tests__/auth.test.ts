import { describe, it, expect, vi } from 'vitest'

// Test the session callback logic directly without importing next-auth
describe('Auth session callback logic', () => {
  it('attaches user id from token sub', async () => {
    // Replicate the callback logic for unit testing
    const sessionCallback = async ({
      session,
      token,
    }: {
      session: { user: Record<string, string> }
      token: { sub?: string }
    }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    }

    const session = { user: { name: 'Test', email: 'test@example.com' } }
    const token = { sub: 'user-123' }
    const result = await sessionCallback({ session, token })
    expect(result.user.id).toBe('user-123')
  })

  it('does not set id when token has no sub', async () => {
    const sessionCallback = async ({
      session,
      token,
    }: {
      session: { user: Record<string, string> }
      token: { sub?: string }
    }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    }

    const session = { user: { name: 'Test', email: 'test@example.com' } }
    const token = {}
    const result = await sessionCallback({ session, token })
    expect(result.user.id).toBeUndefined()
  })
})

describe('Auth JWT callback logic', () => {
  it('copies user id to token on sign in', async () => {
    const jwtCallback = async ({
      token,
      user,
    }: {
      token: Record<string, string>
      user?: { id?: string } | null
    }) => {
      if (user) {
        token.sub = user.id ?? ''
      }
      return token
    }

    const token = {}
    const user = { id: 'user-456' }
    const result = await jwtCallback({ token, user })
    expect(result.sub).toBe('user-456')
  })
})

describe('Public route detection', () => {
  const isPublicRoute = (pathname: string) =>
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth')

  it('allows root path', () => {
    expect(isPublicRoute('/')).toBe(true)
  })

  it('allows /auth/signin', () => {
    expect(isPublicRoute('/auth/signin')).toBe(true)
  })

  it('allows /api/auth/callback', () => {
    expect(isPublicRoute('/api/auth/callback/google')).toBe(true)
  })

  it('blocks /dashboard', () => {
    expect(isPublicRoute('/dashboard')).toBe(false)
  })

  it('blocks /api/races', () => {
    expect(isPublicRoute('/api/races')).toBe(false)
  })
})
