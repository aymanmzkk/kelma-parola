import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Library, Plus, Search, Trash2 } from 'lucide-react'
import { LangBadge, LangSelect, ScriptFields, WordText } from '@/components/Lang'
import { Button, Card, Chip, EmptyState, ErrorNote, Field, IconButton, PageHeader, Select, Sheet, SkeletonList, TextArea } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { addVocabulary, deleteVocabulary, listVocabulary } from '@/services/vocabulary'
import { normalizeScripts } from '@/lib/languages'
import { errorMessage, formatDate } from '@/lib/utils'
import type { Difficulty, VocabularyEntry } from '@/types'

type Scope = 'all' | 'mine' | 'taught_to_me' | 'i_taught'
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'All words' },
  { id: 'mine', label: 'My words' },
  { id: 'taught_to_me', label: 'Taught to me' },
  { id: 'i_taught', label: 'I taught' },
]
const exchanged = (v: VocabularyEntry) => v.origin === 'teach' || v.origin === 'challenge'

function AddWordForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const { profile, space, me, partner } = useAuth()
  const toast = useToast()
  const common = space?.common_lang ?? 'en'
  const [source, setSource] = useState(common)
  const [target, setTarget] = useState(me && me.lang !== common ? me.lang : (partner?.lang ?? common))
  const [word, setWord] = useState('')
  const [wordAlt, setWordAlt] = useState('')
  const [translation, setTranslation] = useState('')
  const [translationAlt, setTranslationAlt] = useState('')
  const [extra, setExtra] = useState({ pronunciation: '', example_sentence: '', note: '', difficulty: 'medium' as Difficulty })
  const [busy, setBusy] = useState(false)
  if (!profile || !space) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const w = normalizeScripts(word, wordAlt)
    const t = normalizeScripts(translation, translationAlt)
    if (!w.main || !t.main) return
    setBusy(true)
    try {
      await addVocabulary(space.id, profile.id, {
        source_lang: source, word: w.main, word_alt: w.alt, target_lang: target, translation: t.main, translation_alt: t.alt, ...extra,
      })
      toast('Word saved', 'success')
      await onAdded()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <LangSelect label="From" value={source} onChange={setSource} />
        <LangSelect label="To" value={target} onChange={setTarget} />
      </div>
      <ScriptFields code={source} label="Word" required maxLength={80} value={word} alt={wordAlt} onChange={(v, a) => { setWord(v); setWordAlt(a) }} />
      <ScriptFields code={target} label="Translation / meaning" required value={translation} alt={translationAlt}
        onChange={(v, a) => { setTranslation(v); setTranslationAlt(a) }} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pronunciation" maxLength={80} value={extra.pronunciation} onChange={(e) => setExtra((x) => ({ ...x, pronunciation: e.target.value }))} />
        <Select label="Difficulty" value={extra.difficulty} onChange={(e) => setExtra((x) => ({ ...x, difficulty: e.target.value as Difficulty }))}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
      </div>
      <TextArea label="Example (optional)" dir="auto" maxLength={300} value={extra.example_sentence} onChange={(e) => setExtra((x) => ({ ...x, example_sentence: e.target.value }))} />
      <TextArea label="Notes (optional)" dir="auto" maxLength={300} placeholder="Context, other meanings…" value={extra.note} onChange={(e) => setExtra((x) => ({ ...x, note: e.target.value }))} />
      <Button type="submit" full loading={busy}>Save word</Button>
    </form>
  )
}

export default function Vocabulary() {
  const { profile, space, version, languages } = useAuth()
  const toast = useToast()
  const spaceId = space?.id ?? ''
  const { data, loading, error, reload } = useAsync(() => (spaceId ? listVocabulary(spaceId) : Promise.resolve([])), [version, spaceId])
  const [scope, setScope] = useState<Scope>('all')
  const [langFilter, setLangFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const myId = profile?.id

  // Language filters come from the data and the space, never from a hardcoded list.
  const langCodes = useMemo(() => {
    const used = new Set<string>()
    if (space) [space.common_lang, space.language_a, space.language_b].forEach((c) => used.add(c))
    for (const v of data ?? []) {
      used.add(v.source_lang)
      used.add(v.target_lang)
    }
    return languages.filter((l) => used.has(l.code))
  }, [data, space, languages])

  // Entries for the same word are grouped, so one word can show several translations.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (data ?? []).filter((v) =>
      (scope === 'all'
        || (scope === 'mine' && v.added_by === myId && v.origin === 'manual')
        || (scope === 'taught_to_me' && exchanged(v) && v.added_by !== myId)
        || (scope === 'i_taught' && exchanged(v) && v.added_by === myId))
      && (langFilter === 'all' || v.source_lang === langFilter || v.target_lang === langFilter)
      && (!q || [v.word, v.word_alt, v.translation, v.translation_alt].some((s) => s?.toLowerCase().includes(q))))
    const map = new Map<string, VocabularyEntry[]>()
    for (const v of filtered) {
      const key = `${v.source_lang}|${v.word.trim().toLowerCase()}`
      map.set(key, [...(map.get(key) ?? []), v])
    }
    return Array.from(map.values())
  }, [data, scope, langFilter, query, myId])

  if (!profile || !space) return null
  const nameOf = (id: string) => (id === profile.id ? 'You' : (space.members.find((m) => m.user_id === id)?.name ?? 'Partner'))

  const onDelete = async (id: string) => {
    if (!window.confirm('Remove this translation from the shared vocabulary?')) return
    try {
      await deleteVocabulary(id)
      await reload()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Vocabulary" subtitle={`${data?.length ?? 0} entries shared in this space.`}
        action={<Button onClick={() => setOpen(true)}><Plus size={18} /> Add</Button>} />

      <Sheet open={open} onClose={() => setOpen(false)} title="Add a word">
        <AddWordForm onAdded={async () => { setOpen(false); await reload() }} />
      </Sheet>

      <div className="space-y-2.5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" className="input pl-10" placeholder="Search words" aria-label="Search words" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {SCOPES.map((s) => <Chip key={s.id} active={scope === s.id} onClick={() => setScope(s.id)}>{s.label}</Chip>)}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={langFilter === 'all'} onClick={() => setLangFilter('all')}>All languages</Chip>
          {langCodes.map((l) => <Chip key={l.code} active={langFilter === l.code} onClick={() => setLangFilter(l.code)}>{l.name}</Chip>)}
        </div>
      </div>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorNote message={error} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Library}
          title={(data?.length ?? 0) === 0 ? 'No words yet' : 'No words match these filters'}
          text={(data?.length ?? 0) === 0 ? 'Words from daily challenges, challenges and the ones you add appear here.' : undefined} />
      ) : (
        <div className="space-y-3">
          {groups.map((entries) => {
            const first = entries[0]
            return (
              <Card key={`${first.source_lang}|${first.word}`} className="!p-4">
                <LangBadge code={first.source_lang} />
                <h3 className="mt-1 text-xl font-bold tracking-tight"><WordText text={first.word} alt={first.word_alt} /></h3>
                {first.pronunciation && <p className="text-sm text-stone-500 dark:text-stone-400">{first.pronunciation}</p>}
                <ul className="mt-3 space-y-2.5">
                  {entries.map((v) => (
                    <li key={v.id} className="rounded-xl bg-stone-900/[0.04] p-3 dark:bg-white/5">
                      <div className="flex items-start gap-2">
                        <ArrowRight size={14} className="mt-1.5 shrink-0 text-stone-400" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-brand-700 dark:text-brand-200"><WordText text={v.translation} alt={v.translation_alt} /></p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                            <LangBadge code={v.target_lang} /> {nameOf(v.added_by)} · {formatDate(v.created_at)}
                            {v.difficulty !== 'medium' && <span className="capitalize">· {v.difficulty}</span>}
                          </p>
                          {v.example_sentence && <p dir="auto" className="mt-2 text-sm italic text-stone-600 dark:text-stone-300">“{v.example_sentence}”</p>}
                          {v.note && <p dir="auto" className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">{v.note}</p>}
                        </div>
                        {v.added_by === profile.id && (
                          <IconButton label="Delete" className="-mr-1 -mt-1 h-9 w-9" onClick={() => void onDelete(v.id)}>
                            <Trash2 size={15} />
                          </IconButton>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
