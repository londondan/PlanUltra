import NextAuth, { type Account, type Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
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
