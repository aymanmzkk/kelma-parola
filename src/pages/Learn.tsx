import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronDown, Circle, Send } from 'lucide-react'
import AnswerCard from '@/components/AnswerCard'
import Celebration, { type CelebrationData } from '@/components/Celebration'
import { LangBadge, ScriptFields } from '@/components/Lang'
import StatusPicker from '@/components/StatusPicker'
import { Button, Card, ErrorNote, PageHeader, SkeletonList } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { getHistory, getToday, markTranslation, submitTranslation } from '@/services/daily'
import { notifyPartner } from '@/services/notify'
import { getStats } from '@/services/stats'
import { normalizeScripts } from '@/lib/languages'
import { cn, errorMessage, formatDate } from '@/lib/utils'
import type { HistoryItem, MarkStatus, SpaceMember } from '@/types'

function HistoryRow({ item, members, myId }: { item: HistoryItem; members: SpaceMember[]; myId: string }) {
  const [open, setOpen] = useState(false)
  const ordered = [...members].sort((a, b) => Number(b.user_id === myId) - Number(a.user_id === myId))
  return (
    <div className="card overflow-hidden !p-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
        {item.completed_at ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> : <Circle size={18} className="shrink-0 text-stone-300" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold capitalize">{item.word.word}</span>
          <span className="block text-xs text-stone-500 dark:text-stone-400">{formatDate(item.challenge_date)}</span>
        </span>
        <ChevronDown size={18} className={cn('text-stone-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-200 p-4 dark:border-white/10">
          <p className="text-sm text-stone-600 dark:text-stone-300">{item.word.definition}</p>
          {item.word.example_sentence && <p className="text-sm italic text-stone-500 dark:text-stone-400">“{item.word.example_sentence}”</p>}
          {ordered.map((m) => {
            const tr = item.translations.find((x) => x.user_id === m.user_id)
            return <AnswerCard key={m.user_id} person={m} langCode={tr?.lang ?? m.lang} answer={tr?.answer} alt={tr?.answer_alt} status={tr?.status} waiting={!tr} />
          })}
        </div>
      )}
    </div>
  )
}

export default function Learn() {
  const { profile, space, me, partner, version, refresh, lang } = useAuth()
  const toast = useToast()
  const spaceId = space?.id ?? ''
  const today = useAsync(() => (spaceId ? getToday(spaceId) : Promise.resolve(null)), [version, spaceId])
  const history = useAsync(() => (spaceId ? getHistory(spaceId, 40) : Promise.resolve([])), [version, spaceId])
  const [answer, setAnswer] = useState('')
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [celebration, setCelebration] = useState<CelebrationData | null>(null)
  const previous = useRef<{ id: string; revealed: boolean } | null>(null)

  const t = today.data
  const theirs = t?.others[0] ?? null
  const revealed = Boolean(t?.mine && theirs)
  const partnerName = partner?.name ?? 'your learning partner'

  useEffect(() => {
    if (!t || !spaceId) return
    const was = previous.current
    if (was && was.id === t.challenge.id && !was.revealed && revealed) {
      const word = t.word.word
      getStats(spaceId)
        .then((s) => setCelebration({ title: `${s.current_streak}-day streak`, subtitle: `You both translated “${word}”.` }))
        .catch(() => undefined)
    }
    previous.current = { id: t.challenge.id, revealed }
  }, [t, revealed, spaceId])

  if (!profile || !space || !me) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!t) return
    const value = normalizeScripts(answer, alt)
    if (!value.main) return
    setBusy(true)
    try {
      const result = await submitTranslation(t.challenge.id, value.main, value.alt)
      setAnswer('')
      setAlt('')
      void notifyPartner(result.completed ? 'daily_completed' : 'daily_answered', space.id, t.word.word)
      await today.reload()
      void refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onMark = async (status: MarkStatus) => {
    if (!t?.mine) return
    setBusy(true)
    try {
      await markTranslation(t.mine.id, status)
      await today.reload()
      void refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const past = (history.data ?? []).filter((h) => h.id !== t?.challenge.id)

  return (
    <div className="space-y-5">
      <Celebration data={celebration} onDone={() => setCelebration(null)} />
      <PageHeader title="Learn" subtitle="One shared word a day. Each of you translates it." />

      {today.loading ? (
        <SkeletonList rows={1} />
      ) : today.error || !t ? (
        <ErrorNote message={today.error ?? 'Could not load today’s word.'} />
      ) : (
        <Card className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-brand-700 dark:text-brand-200">Today's word</span>
              <LangBadge code={t.word.lang} />
              <span className="rounded-full bg-stone-900/5 px-2.5 py-1 capitalize text-stone-500 dark:bg-white/10 dark:text-stone-300">{t.word.difficulty}</span>
              <span className="rounded-full bg-stone-900/5 px-2.5 py-1 capitalize text-stone-500 dark:bg-white/10 dark:text-stone-300">{t.word.category}</span>
            </div>
            <h2 className="mt-3 text-4xl font-bold capitalize tracking-tight">{t.word.word}</h2>
            {t.word.pronunciation && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t.word.pronunciation}</p>}
            <p className="mt-3 text-stone-600 dark:text-stone-300">{t.word.definition}</p>
            {revealed && t.word.example_sentence && (
              <p className="mt-3 rounded-xl bg-stone-900/[0.04] p-3.5 text-sm italic text-stone-600 dark:bg-white/5 dark:text-stone-300">“{t.word.example_sentence}”</p>
            )}
          </div>

          {!t.mine ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <ScriptFields code={t.answer_lang} label={`Your translation in ${lang(t.answer_lang).name}`} required
                value={answer} alt={alt} onChange={(v, a) => { setAnswer(v); setAlt(a) }} />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t.answered_count > 0
                  ? `${partnerName} has already answered. Both answers unlock when you submit.`
                  : `${partnerName} cannot see your answer until they submit theirs.`}
              </p>
              <Button type="submit" full loading={busy}><Send size={16} /> Submit</Button>
            </form>
          ) : (
            <div className="space-y-3">
              <AnswerCard person={me} langCode={t.mine.lang} answer={t.mine.answer} alt={t.mine.answer_alt} status={t.mine.status} />
              {theirs
                ? <AnswerCard person={partner} langCode={theirs.lang} answer={theirs.answer} alt={theirs.answer_alt} status={theirs.status} />
                : <AnswerCard person={partner} langCode={partner?.lang ?? ''} waiting />}
              {revealed
                ? <StatusPicker value={t.mine.status} onChange={onMark} disabled={busy} />
                : <p className="text-center text-sm text-stone-500 dark:text-stone-400">Saved. The reveal happens when {partnerName} answers.</p>}
            </div>
          )}
        </Card>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold">Previous words</h2>
          {past.map((item) => <HistoryRow key={item.id} item={item} members={space.members} myId={profile.id} />)}
        </section>
      )}
    </div>
  )
}
