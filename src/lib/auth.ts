import NextAuth, { type Account, type Session, type User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import Google from 'next-auth/providers/google'
import { createOrUpdateUser } from '@/lib/db/users'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      if (account?.providerAccountId && user.email) {
        await createOrUpdateUser(account.providerAccountId, user.email)
      }
      return true
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, account }: { token: JWT; account?: Account | null }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId
      }
      return token
    },
  },
})
