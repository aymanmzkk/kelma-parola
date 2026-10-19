import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import { LangSelect } from '@/components/Lang'
import { Button, Chip, ErrorNote, Field } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { signUp } from '@/services/auth'
import { errorMessage } from '@/lib/utils'

export default function Register() {
  const { languages } = useAuth()
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', native_lang: '', learning_lang: '' })
  const [others, setOthers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const toggleOther = (code: string) =>
    setOthers((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { needsConfirmation } = await signUp({
        ...form,
        email: form.email.trim(),
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        other_langs: others.filter((c) => c !== form.native_lang && c !== form.learning_lang),
      })
      if (needsConfirmation) setConfirmSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (confirmSent) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a confirmation link to ${form.email}.`}>
        <p className="text-sm text-stone-600 dark:text-stone-300">Open the link in the email, then come back and sign in.</p>
        <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-brand-600 dark:text-brand-300">
          Go to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="Learn languages together with a partner.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" required maxLength={60} autoComplete="given-name" value={form.name} onChange={(e) => update({ name: e.target.value })} />
        <Field label="Username" required minLength={2} maxLength={30} pattern="[A-Za-z0-9_]+" hint="Letters, numbers and _ only."
          autoComplete="username" value={form.username} onChange={(e) => update({ username: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <LangSelect label="Native language" value={form.native_lang} onChange={(c) => update({ native_lang: c })} required placeholder="Select" />
          <LangSelect label="I am learning" value={form.learning_lang} onChange={(c) => update({ learning_lang: c })} required placeholder="Select" />
        </div>
        <div>
          <span className="label">Other languages I know (optional)</span>
          <div className="flex flex-wrap gap-2">
            {languages.filter((l) => l.code !== form.native_lang && l.code !== form.learning_lang).map((l) => (
              <Chip key={l.code} active={others.includes(l.code)} onClick={() => toggleOther(l.code)}>
                {l.name}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
        <Field label="Password" type="password" required minLength={8} hint="At least 8 characters." autoComplete="new-password"
          value={form.password} onChange={(e) => update({ password: e.target.value })} />
        {error && <ErrorNote message={error} />}
        <Button type="submit" full loading={busy}>Create account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-300">Sign in</Link>
      </p>
    </AuthShell>
  )
}
