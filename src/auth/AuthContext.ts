import { createContext } from 'react'
import type { AuthService, AuthUser } from './types'

export interface AuthContextValue {
  user: AuthUser | null
  /** True until the initial session lookup has finished. */
  loading: boolean
  mode: AuthService['mode']
  signIn: AuthService['signIn']
  signUp: AuthService['signUp']
  signOut: AuthService['signOut']
  requestPasswordReset: AuthService['requestPasswordReset']
  updatePassword: AuthService['updatePassword']
}

export const AuthContext = createContext<AuthContextValue | null>(null)
