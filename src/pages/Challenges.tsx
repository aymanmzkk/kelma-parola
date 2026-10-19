import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, GraduationCap, Inbox, Lightbulb, MessageSquarePlus, Plus, Send } from 'lucide-react'
import AnswerCard from '@/components/AnswerCard'
import { LangBadge, LangSelect, ScriptFields, WordText } from '@/components/Lang'
import StatusPicker from '@/components/StatusPicker'
import { Button, Card, Chip, EmptyState, ErrorNote, Field, PageHeader, Sheet, SkeletonList, TextArea } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { answerChallenge, listChallenges, markChallenge, sendChallenge } from '@/services/challenges'
import { notifyPartner } from '@/services/notify'
import { joinScripts, normalizeScripts } from '@/lib/languages'
import { errorMessage, timeAgo } from '@/lib/utils'
import type { Challenge, ChallengeKind, MarkStatus, Space, SpaceMember } from '@/types'

/** Sensible language defaults so beginners never have to touch the pickers. */
function defaults(kind: ChallengeKind, space: Space, me: SpaceMember, partner: SpaceMember | null) {
  const common = space.common_lang
  const partnerLang = partner?.lang ?? (space.language_a === me.lang ? space.language_b : space.language_a)
  if (kind === 'teach') {
    const target = common !== me.lang ? common : partnerLang
    return { source: me.lang, target, answerLang: target }
  }
  return {
    source: common,
    target: partnerLang !== common ? partnerLang : me.lang,
    answerLang: me.lang !== common ? me.lang : partnerLang,
  }
}

function Explanation({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
      <Lightbulb size={16} className="mt-0.5 shrink-0" />
      <span dir="auto">{text}</span>
    </p>
  )
}

function Prompt({ c, caption }: { c: Challenge; caption: string }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
        {c.kind === 'teach' ? <GraduationCap size={14} /> : <MessageSquarePlus size={14} />}
        {caption} · {timeAgo(c.created_at)}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <LangBadge code={c.source_lang} /> <ArrowRight size={12} className="text-stone-400" /> <LangBadge code={c.target_lang} />
      </p>
      <h3 className="mt-1.5 text-2xl font-bold tracking-tight"><WordText text={c.prompt} alt={c.prompt_alt} /></h3>
    </div>
  )
}

function ReceivedCard({ c, me, partner, onChanged }: { c: Challenge; me: SpaceMember; partner: SpaceMember | null; onChanged: () => Promise<void> }) {
  const toast = useToast()
  const { lang } = useAuth()
  const [answer, setAnswer] = useState('')
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = joinScripts(answer, alt)
    if (!value) return
    setBusy(true)
    try {
      await answerChallenge(c.id, value)
      void notifyPartner('challenge_answered', c.space_id, c.prompt)
      await onChanged()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }
  const mark = async (status: MarkStatus) => {
    setBusy(true)
    try {
      await markChallenge(c.id, status)
      await onChanged()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <Prompt c={c} caption={c.kind === 'teach' ? `${partner?.name ?? 'Your partner'} is teaching you a word` : `New challenge from ${partner?.name ?? 'your partner'}`} />
      {c.status === 'pending' ? (
        <form onSubmit={submit} className="space-y-3">
          <ScriptFields code={c.target_lang} required value={answer} alt={alt} onChange={(v, a) => { setAnswer(v); setAlt(a) }}
            label={c.kind === 'teach' ? `What does it mean? Answer in ${lang(c.target_lang).name}` : `Your translation in ${lang(c.target_lang).name}`} />
          <Button type="submit" full loading={busy}><Send size={16} /> Submit guess</Button>
        </form>
      ) : (
        <>
          <AnswerCard person={me} langCode={c.target_lang} answer={c.receiver_answer} status={c.receiver_status} />
          <AnswerCard person={partner} langCode={c.sender_answer_lang} answer={c.sender_answer} />
          <Explanation text={c.explanation} />
          <StatusPicker value={c.receiver_status} onChange={mark} disabled={busy} />
        </>
      )}
    </Card>
  )
}

function SentCard({ c, me, partner }: { c: Challenge; me: SpaceMember; partner: SpaceMember | null }) {
  return (
    <Card className="space-y-3">
      <Prompt c={c} caption={`Sent to ${partner?.name ?? 'your partner'}`} />
      <AnswerCard person={me} langCode={c.sender_answer_lang} answer={c.sender_answer} />
      <Explanation text={c.explanation} />
      {c.status === 'answered'
        ? <AnswerCard person={partner} langCode={c.target_lang} answer={c.receiver_answer} status={c.receiver_status} />
        : <AnswerCard person={partner} langCode={c.target_lang} waiting />}
    </Card>
  )
}

function NewChallengeForm({ initialKind, onSent }: { initialKind: ChallengeKind; onSent: () => Promise<void> }) {
  const { space, me, partner, lang } = useAuth()
  const toast = useToast()
  const [kind, setKind] = useState<ChallengeKind>(initialKind)
  const [langs, setLangs] = useState(() => (space && me ? defaults(initialKind, space, me, partner) : { source: 'en', target: 'en', answerLang: 'en' }))
  const [showLangs, setShowLangs] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [promptAlt, setPromptAlt] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerAlt, setAnswerAlt] = useState('')
  const [explanation, setExplanation] = useState('')
  const [busy, setBusy] = useState(false)
  if (!space || !me) return null

  const changeKind = (k: ChallengeKind) => {
    setKind(k)
    setLangs(defaults(k, space, me, partner))
  }
  const answerLang = kind === 'teach' ? langs.target : langs.answerLang

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const p = normalizeScripts(prompt, promptAlt)
    const a = joinScripts(answer, answerAlt)
    if (!p.main || !a) return
    setBusy(true)
    try {
      await sendChallenge({
        spaceId: space.id, kind, sourceLang: langs.source, prompt: p.main, promptAlt: p.alt,
        targetLang: langs.target, answer: a, answerLang, explanation: explanation.trim(),
      })
      void notifyPartner('partner_challenge', space.id, p.main)
      toast(`Sent to ${partner?.name ?? 'your partner'}`, 'success')
      await onSent()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!partner) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Your learning partner has not joined yet. Share the invitation code from the Home screen.</p>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Chip active={kind === 'translate'} onClick={() => changeKind('translate')}>Translate</Chip>
        <Chip active={kind === 'teach'} onClick={() => changeKind('teach')}>Teach a word</Chip>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-900/[0.04] px-3 py-2.5 text-sm dark:bg-white/5">
        <span className="flex flex-wrap items-center gap-2">
          <LangBadge code={langs.source} /> <ArrowRight size={12} className="text-stone-400" /> <LangBadge code={langs.target} />
        </span>
        <button type="button" onClick={() => setShowLangs((s) => !s)} className="text-xs font-semibold text-brand-600 dark:text-brand-300">
          {showLangs ? 'Hide' : 'Change languages'}
        </button>
      </div>
      {showLangs && (
        <div className="grid gap-3 sm:grid-cols-2">
          <LangSelect label="Word is in" value={langs.source} onChange={(c) => setLangs((l) => ({ ...l, source: c }))} />
          <LangSelect label={`${partner.name} answers in`} value={langs.target} onChange={(c) => setLangs((l) => ({ ...l, target: c }))} />
          {kind === 'translate' && (
            <LangSelect label="My answer is in" value={langs.answerLang} onChange={(c) => setLangs((l) => ({ ...l, answerLang: c }))} />
          )}
        </div>
      )}

      <ScriptFields code={langs.source} label="Word" required maxLength={80} value={prompt} alt={promptAlt}
        onChange={(v, a) => { setPrompt(v); setPromptAlt(a) }} />
      <ScriptFields code={answerLang} required value={answer} alt={answerAlt} onChange={(v, a) => { setAnswer(v); setAnswerAlt(a) }}
        label={kind === 'teach' ? `Meaning in ${lang(answerLang).name}` : `My answer in ${lang(answerLang).name}`} />
      <TextArea label={kind === 'teach' ? 'Explanation (optional)' : 'Note (optional)'} dir="auto" maxLength={500}
        placeholder={kind === 'teach' ? 'When is it used? Does it have other meanings?' : ''}
        value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      <p className="text-xs text-stone-500 dark:text-stone-400">{partner.name} sees your answer only after submitting a guess.</p>
      <Button type="submit" full loading={busy}><Send size={16} /> Send</Button>
    </form>
  )
}

export default function Challenges() {
  const { profile, space, me, partner, version, refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const requested = params.get('new')
  const [open, setOpen] = useState(requested !== null)
  const spaceId = space?.id ?? ''
  const { data, loading, error, reload } = useAsync(() => (spaceId ? listChallenges(spaceId) : Promise.resolve([])), [version, spaceId])

  if (!profile || !space || !me) return null
  const received = (data ?? []).filter((c) => c.receiver_id === profile.id)
  const sent = (data ?? []).filter((c) => c.sender_id === profile.id)
  const pending = received.filter((c) => c.status === 'pending').length
  const list = tab === 'received' ? received : sent

  const close = () => {
    setOpen(false)
    if (params.has('new')) setParams({}, { replace: true })
  }
  const onChanged = async () => {
    await reload()
    void refresh()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Challenges" subtitle="Send words to translate, or teach one from your language."
        action={<Button onClick={() => setOpen(true)}><Plus size={18} /> New</Button>} />

      <Sheet open={open} onClose={close} title="New challenge">
        <NewChallengeForm initialKind={requested === 'teach' ? 'teach' : 'translate'}
          onSent={async () => { close(); setTab('sent'); await onChanged() }} />
      </Sheet>

      <div className="flex gap-2">
        <Chip active={tab === 'received'} onClick={() => setTab('received')}>Received{pending > 0 ? ` · ${pending}` : ''}</Chip>
        <Chip active={tab === 'sent'} onClick={() => setTab('sent')}>Sent</Chip>
      </div>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorNote message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon={tab === 'received' ? Inbox : Send}
          title={tab === 'received' ? 'No challenges yet' : 'Nothing sent yet'}
          text={tab === 'received' ? 'Challenges from your learning partner appear here.' : 'Pick a word and send it over.'} />
      ) : (
        <div className="space-y-3">
          {list.map((c) => tab === 'received'
            ? <ReceivedCard key={c.id} c={c} me={me} partner={partner} onChanged={onChanged} />
            : <SentCard key={c.id} c={c} me={me} partner={partner} />)}
        </div>
      )}
    </div>
  )
}
