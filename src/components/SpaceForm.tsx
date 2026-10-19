import { useState, type FormEvent } from 'react'
import { LangSelect } from '@/components/Lang'
import { Button, Chip, ErrorNote, Field } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createSpace, joinSpace } from '@/services/spaces'
import { errorMessage } from '@/lib/utils'

/** Create a learning space or join one with an invitation code. */
export default function SpaceForm({ onDone }: { onDone?: () => void }) {
  const { profile, refresh, switchSpace } = useAuth()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [mine, setMine] = useState(profile?.native_lang ?? '')
  const [theirs, setTheirs] = useState(profile && profile.learning_lang !== profile.native_lang ? profile.learning_lang : '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<string>) => {
    setBusy(true)
    setError(null)
    try {
      const id = await action()
      await refresh()
      await switchSpace(id)
      onDone?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    void run(() => createSpace(name, mine, theirs))
  }
  const onJoin = (e: FormEvent) => {
    e.preventDefault()
    void run(() => joinSpace(code))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Chip active={mode === 'create'} onClick={() => setMode('create')}>Create a space</Chip>
        <Chip active={mode === 'join'} onClick={() => setMode('join')}>I have a code</Chip>
      </div>

      {mode === 'create' ? (
        <form onSubmit={onCreate} className="space-y-3">
          <Field label="Name" placeholder="e.g. Me & my sister" maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <LangSelect label="My language" value={mine} onChange={setMine} required placeholder="Select" />
            <LangSelect label="Their language" value={theirs} onChange={setTheirs} required placeholder="Select" />
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Each space keeps its own vocabulary, challenges, streak and progress. You get an invitation code to share.
          </p>
          <Button type="submit" full loading={busy}>Create learning space</Button>
        </form>
      ) : (
        <form onSubmit={onJoin} className="space-y-3">
          <Field
            label="Invitation code"
            placeholder="ABC123"
            required
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            className="text-center text-xl font-semibold uppercase tracking-[0.35em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button type="submit" full loading={busy}>Join learning space</Button>
        </form>
      )}
      {error && <ErrorNote message={error} />}
    </div>
  )
}
