import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { AuthService, AuthUser } from './types'

function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  const email = user.email ?? ''
  return {
    id: user.id,
    email,
    fullName: (meta.full_name as string | undefined) ?? email.split('@')[0],
    businessName: (meta.business_name as string | undefined) ?? '',
  }
}

export function createSupabaseAuth(client: SupabaseClient): AuthService {
  const redirectBase = () => window.location.origin

  return {
    mode: 'supabase',

    async getUser() {
      const { data } = await client.auth.getSession()
      return toAuthUser(data.session?.user)
    },

    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(toAuthUser(session?.user))
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },

    async signUp({ email, password, fullName, businessName }) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, business_name: businessName },
          emailRedirectTo: `${redirectBase()}/dashboard`,
        },
      })
      if (error) throw new Error(error.message)
      // With email confirmations on, Supabase returns a user but no session.
      return { needsEmailConfirmation: !data.session }
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw new Error(error.message)
    },

    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase()}/reset-password`,
      })
      if (error) throw new Error(error.message)
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },
  }
}
