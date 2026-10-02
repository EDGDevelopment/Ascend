import type { AuthService, AuthUser } from './types'

/**
 * Local stand-in used when Supabase is not configured, so the product can be
 * demonstrated end to end. Nothing here is secure: it stores a profile in
 * localStorage and accepts any well-formed credentials.
 */
const STORAGE_KEY = 'ascend.demo.user'
const listeners = new Set<(user: AuthUser | null) => void>()

function read(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function write(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode). The session just won't persist.
  }
  listeners.forEach((l) => l(user))
}

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms))

export const DEMO_ACCOUNT = {
  email: 'demo@ascend.app',
  password: 'ascend-demo',
}

export function createDemoAuth(): AuthService {
  return {
    mode: 'demo',

    async getUser() {
      return read()
    },

    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async signIn(email, password) {
      await wait()
      if (password.length < 6) throw new Error('Password must be at least 6 characters.')
      const existing = read()
      const same = existing?.email === email
      write({
        id: 'demo-user',
        email,
        fullName: same ? existing.fullName : 'Maya Brooks',
        businessName: same ? existing.businessName : "Bella's Cafe",
      })
    },

    async signUp({ email, fullName, businessName }) {
      await wait()
      write({ id: 'demo-user', email, fullName, businessName })
      return { needsEmailConfirmation: false }
    },

    async signOut() {
      write(null)
    },

    async requestPasswordReset() {
      await wait()
    },

    async updatePassword() {
      await wait()
    },
  }
}
