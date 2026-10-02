export interface AuthUser {
  id: string
  email: string
  fullName: string
  businessName: string
}

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  businessName: string
}

export interface SignUpResult {
  /** True when the user must confirm their email before signing in. */
  needsEmailConfirmation: boolean
}

/**
 * The surface the UI depends on. There is a Supabase implementation and a
 * local demo implementation, selected in authService.ts.
 */
export interface AuthService {
  readonly mode: 'supabase' | 'demo'
  getUser(): Promise<AuthUser | null>
  onChange(listener: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(input: SignUpInput): Promise<SignUpResult>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
}
