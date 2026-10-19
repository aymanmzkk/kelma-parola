import { useMemo, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Card, ErrorNote, Field, PageHeader, Select, Spinner, TextArea } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { addWord, deleteWord, listWords, type NewWord } from '@/services/words'
import { errorMessage } from '@/lib/utils'
import type { Difficulty } from '@/types'

const EMPTY: NewWord = {
  word: '',
  definition: '',
  example_sentence: '',
  difficulty: 'medium',
  category: 'general',
  pronunciation: '',
}

/** Developer / admin screen: manage the bank of daily English words. */
export default function Admin() {
  const { profile } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(listWords, [])
  const [form, setForm] = useState<NewWord>(EMPTY)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const words = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter((w) => !q || w.word.toLowerCase().includes(q) || w.category.toLowerCase().includes(q))
  }, [data, query])

  if (!profile) return null
  const update = (patch: Partial<NewWord>) => setForm((f) => ({ ...f, ...patch }))

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.word.trim() || !form.definition.trim()) return
    setBusy(true)
    try {
      await addWord(profile.id, form)
      toast(`“${form.word.trim()}” added to the word bank`, 'success')
      setForm(EMPTY)
      await reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: string, word: string) => {
    if (!window.confirm(`Delete “${word}” from the word bank?`)) return
    try {
      await deleteWord(id)
      await reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Word bank" subtitle={`${data?.length ?? 0} words. One is picked at random each day, without repeats.`} />

      <Card>
        <h2 className="font-semibold">Add a word</h2>
        <form onSubmit={onAdd} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="English word" required maxLength={80} value={form.word} onChange={(e) => update({ word: e.target.value })} />
            <Field label="Pronunciation" placeholder="/ˈwɜːrd/" maxLength={80} value={form.pronunciation} onChange={(e) => update({ pronunciation: e.target.value })} />
          </div>
          <TextArea label="Definition" required maxLength={400} value={form.definition} onChange={(e) => update({ definition: e.target.value })} />
          <TextArea label="Example sentence" maxLength={400} value={form.example_sentence} onChange={(e) => update({ example_sentence: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Difficulty" value={form.difficulty} onChange={(e) => update({ difficulty: e.target.value as Difficulty })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
            <Field label="Category" maxLength={40} value={form.category} onChange={(e) => update({ category: e.target.value })} />
          </div>
          <Button type="submit" full loading={busy}>
            Add word
          </Button>
        </form>
      </Card>

      <Field type="search" placeholder="Search the word bank…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} />
      ) : (
        <Card className="divide-y divide-stone-200/70 !p-0 dark:divide-white/10">
          {words.length === 0 && <p className="p-4 text-sm text-stone-500 dark:text-stone-400">No words found.</p>}
          {words.map((w) => (
            <div key={w.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold capitalize">
                  {w.word} <span className="text-xs font-normal text-stone-400">{w.pronunciation}</span>
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-300">{w.definition}</p>
                <p className="mt-1 text-xs capitalize text-stone-400">
                  {w.difficulty} · {w.category}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${w.word}`}
                onClick={() => void onDelete(w.id, w.word)}
                className="rounded-full p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
