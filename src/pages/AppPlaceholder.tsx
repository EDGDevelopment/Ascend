import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'

/** Temporary signed-in landing spot until the dashboard shell exists. */
export default function AppPlaceholder() {
  const { user, signOut } = useAuth()
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="text-center">
        <p className="text-sm text-ink-muted">Signed in as {user?.email}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </main>
  )
}
