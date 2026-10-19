import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import { Button, ErrorNote, Field } from '@/components/ui'
import { signIn } from '@/services/auth'
import { errorMessage } from '@/lib/utils'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      // The app switches to the signed-in routes automatically.
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Your words are waiting for you.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorNote message={error} />}
        <Button type="submit" full loading={busy}>
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
        New here?{' '}
        <Link to="/register" className="font-semibold text-rose-600 dark:text-rose-300">
          Create your account
        </Link>
      </p>
    </AuthShell>
  )
}
