import AuthShell from '@/components/AuthShell'
import SpaceForm from '@/components/SpaceForm'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/auth'

/** Shown when the signed-in user is not in any learning space yet. */
export default function SpaceSetup() {
  const { profile } = useAuth()
  return (
    <AuthShell title={`Welcome, ${profile?.name ?? ''}`} subtitle="Set up a learning space with your learning partner.">
      <SpaceForm />
      <button type="button" onClick={() => void signOut()} className="mt-5 block w-full text-center text-sm text-stone-400 hover:text-stone-600">
        Sign out
      </button>
    </AuthShell>
  )
}
