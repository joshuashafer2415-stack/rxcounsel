import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authConfig = {
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user } = await db
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          subscriptionStatus: user.subscription_status,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.subscriptionStatus = user.subscriptionStatus
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }: any) {
      session.user.subscriptionStatus = token.subscriptionStatus
      session.user.id = token.userId
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
