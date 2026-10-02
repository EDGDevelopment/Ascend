import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { authService } from './authService'
import type { AuthUser } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authService.getUser().then((u) => {
      if (!active) return
      setUser(u)
      setLoading(false)
    })
    const unsubscribe = authService.onChange((u) => {
      if (!active) return
      setUser(u)
      setLoading(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode: authService.mode,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
      requestPasswordReset: authService.requestPasswordReset,
      updatePassword: authService.updatePassword,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
