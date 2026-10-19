import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { LangPair } from '@/components/Lang'
import SpaceForm from '@/components/SpaceForm'
import { Button, Sheet } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'

export function SpaceIcon({ space, size = 36 }: { space: Space; size?: number }) {
  if (space.photo_url) return <Avatar value={space.photo_url} size={size} />
  return (
    <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
      <Users size={size * 0.5} />
    </span>
  )
}

/** Shows the active learning space and lets the user switch, create or join. */
export default function SpaceSwitcher() {
  const { spaces, space, switchSpace } = useAuth()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  if (!space) return null

  const close = () => {
    setOpen(false)
    setCreating(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Switch learning space"
        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-stone-900/5 dark:hover:bg-white/10"
      >
        <SpaceIcon space={space} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{space.name}</span>
          <LangPair a={space.language_a} b={space.language_b} className="mt-0.5" />
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-stone-400" />
      </button>

      <Sheet open={open} onClose={close} title={creating ? 'New learning space' : 'Learning spaces'}>
        {creating ? (
          <SpaceForm onDone={close} />
        ) : (
          <div className="space-y-2">
            {spaces.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  void switchSpace(s.id)
                  close()
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                  s.id === space.id
                    ? 'border-brand-500 bg-brand-500/5'
                    : 'border-stone-200 hover:bg-stone-50 dark:border-white/10 dark:hover:bg-white/5',
                )}
              >
                <SpaceIcon space={s} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                    {s.members.map((m) => m.name).join(' + ')}
                  </span>
                  <LangPair a={s.language_a} b={s.language_b} showNames className="mt-1" />
                </span>
                {s.id === space.id && <Check size={18} className="shrink-0 text-brand-600" />}
              </button>
            ))}
            <Button variant="secondary" full className="mt-2" onClick={() => setCreating(true)}>
              <Plus size={18} /> Create or join a space
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}
