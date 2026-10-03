import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { DEMO_ACCOUNT } from '@/auth/demoAuth'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { AuthShowcase } from './AuthShowcase'

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

const copy: Record<AuthMode, { title: string; subtitle: string; cta: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: '',
    cta: 'Sign in',
  },
  signup: {
    title: 'Create your account',
    subtitle: '',
    cta: 'Create account',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: 'We will email you a reset link.',
    cta: 'Send reset link',
  },
  reset: {
    title: 'Choose a new password',
    subtitle: '',
    cta: 'Update password',
  },
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink"
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  )
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState(() => (location.state as { email?: string } | null)?.email ?? '')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null)

  // Signed-in users have no business on the login or signup screens.
  if (auth.user && (mode === 'login' || mode === 'signup')) {
    return <Navigate to={from} replace />
  }

  const { title, subtitle, cta } = copy[mode]

  async function run(action: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void run(async () => {
      if (mode === 'login') {
        await auth.signIn(email.trim(), password)
        navigate(from, { replace: true })
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.')
        const result = await auth.signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          businessName: businessName.trim(),
        })
        if (result.needsEmailConfirmation) {
          setNotice({
            title: 'Check your inbox',
            body: `Confirm your email at ${email.trim()} to finish signing up.`,
          })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else if (mode === 'forgot') {
        await auth.requestPasswordReset(email.trim())
        setNotice({
          title: 'Reset link sent',
          body: 'If that email has an account, a reset link is on its way.',
        })
      } else {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.')
        await auth.updatePassword(password)
        navigate('/dashboard', { replace: true })
      }
    })
  }

  function signInAsDemo() {
    void run(async () => {
      await auth.signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
      navigate('/dashboard', { replace: true })
    })
  }

  const passwordField = (
    <Field
      label="Password"
      type={showPassword ? 'text' : 'password'}
      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      minLength={mode === 'login' ? undefined : 8}
      required
      hint={mode === 'signup' ? '8 characters or more' : undefined}
      trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
    />
  )

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-10">
        <Logo />

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {notice ? (
            <div role="status" className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
                <MailCheck size={22} />
              </div>
              <h1 className="mt-5 font-display text-3xl leading-tight">{notice.title}</h1>
              <p className="mt-2 text-sm text-ink-muted">{notice.body}</p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl leading-tight">{title}</h1>
              {subtitle && <p className="mt-3 text-sm text-ink-muted">{subtitle}</p>}

              {auth.mode === 'demo' && mode === 'login' && (
                <div className="mt-6 rounded-lg bg-accent-soft p-4">
                  <p className="text-[13px] text-ink-muted">
                    <span className="font-semibold text-accent-strong">Demo mode.</span> Any email and a 6+ character password will sign in.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={signInAsDemo}
                    disabled={busy}
                  >
                    Continue as demo user
                  </Button>
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {mode === 'signup' && (
                  <>
                    <Field
                      label="Full name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    <Field
                      label="Business name"
                      autoComplete="organization"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </>
                )}

                {mode !== 'reset' && (
                  <Field
                    label="Email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                )}

                {mode !== 'forgot' && passwordField}

                {mode === 'login' && (
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-[13px] font-medium text-accent hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-down-soft px-3.5 py-2.5 text-[13px] text-down"
                  >
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Working...' : cta}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-muted">
                {mode === 'login' && (
                  <>
                    New to Ascend?{' '}
                    <Link to="/signup" className="font-medium text-accent hover:underline">
                      Create an account
                    </Link>
                  </>
                )}
                {mode === 'signup' && (
                  <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-accent hover:underline">
                      Sign in
                    </Link>
                  </>
                )}
                {(mode === 'forgot' || mode === 'reset') && (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                  >
                    <ArrowLeft size={15} /> Back to sign in
                  </Link>
                )}
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-faint">&copy; 2026 Ascend</p>
      </main>

      <AuthShowcase />
    </div>
  )
}
