import { Link } from 'react-router-dom'
import {
  BookOpen, Check, ChevronRight, Circle, Copy, Flame, GraduationCap, Languages, Library, MessageSquarePlus,
  Share2, TrendingUp, type LucideIcon,
} from 'lucide-react'
import ActivityList from '@/components/ActivityList'
import { LangBadge } from '@/components/Lang'
import { Button, Card, ErrorNote, SkeletonList, StatTile } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { listChallenges } from '@/services/challenges'
import { getToday } from '@/services/daily'
import { getActivity, getStats } from '@/services/stats'
import { cn } from '@/lib/utils'

const ACTIONS: { to: string; label: string; hint: string; icon: LucideIcon }[] = [
  { to: '/challenges?new=translate', label: 'New challenge', hint: 'Send a word to translate', icon: MessageSquarePlus },
  { to: '/challenges?new=teach', label: 'Teach a word', hint: 'From your language', icon: GraduationCap },
  { to: '/words', label: 'Vocabulary', hint: 'Your shared words', icon: Library },
  { to: '/progress', label: 'Progress', hint: 'Streak and milestones', icon: TrendingUp },
]

function Pill({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      done ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-stone-900/5 text-stone-500 dark:bg-white/10 dark:text-stone-300')}>
      {done ? <Check size={12} /> : <Circle size={12} />}
      {label}
    </span>
  )
}

export default function Home() {
  const { profile, space, partner, version } = useAuth()
  const toast = useToast()
  const spaceId = space?.id ?? ''

  const { data, loading, error } = useAsync(async () => {
    if (!spaceId) return null
    const [today, stats, activity, challenges] = await Promise.all([
      getToday(spaceId).catch(() => null),
      getStats(spaceId),
      getActivity(spaceId, 8),
      listChallenges(spaceId),
    ])
    return { today, stats, activity, challenges }
  }, [version, spaceId])

  if (!profile || !space) return null

  const partnerName = partner?.name ?? 'your learning partner'
  const t = data?.today ?? null
  const theyAnswered = t ? t.answered_count > (t.mine ? 1 : 0) : false
  const done = Boolean(t?.mine && t.others.length > 0)
  const incoming = (data?.challenges ?? []).filter((c) => c.receiver_id === profile.id && c.status === 'pending')
  const status = !t ? '' : done ? 'Both answers are in.' : t.mine ? `Waiting for ${partnerName}.`
    : theyAnswered ? `${partnerName} answered. Your turn.` : 'Your turn.'

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(space.invite_code)
      toast('Invitation code copied', 'success')
    } catch {
      toast(`Your code: ${space.invite_code}`)
    }
  }
  const shareCode = async () => {
    const text = `Join my learning space “${space.name}” on Kelma & Parola: create an account at ${window.location.origin} and enter the code ${space.invite_code}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text })
      } catch {
        // share sheet closed
      }
    } else {
      await copyCode()
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-stone-500 dark:text-stone-400">Hi {profile.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">{space.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <LangBadge code={space.language_a} /> <LangBadge code={space.language_b} />
          {partner && <span>with {partner.name}</span>}
        </p>
      </header>

      {space.members.length < space.max_members && (
        <Card className="border-brand-200 bg-brand-50 dark:border-brand-400/20 dark:bg-brand-500/10">
          <p className="text-sm font-semibold">Invite your learning partner</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">They create an account, then enter this code.</p>
          <p className="mt-3 text-center font-mono text-3xl font-bold tracking-[0.3em]">{space.invite_code}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={copyCode}><Copy size={16} /> Copy</Button>
            <Button onClick={shareCode}><Share2 size={16} /> Share</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : error || !data ? (
        <ErrorNote message={error ?? 'Could not load this learning space.'} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Flame} tone="amber" label="Day streak" value={data.stats.current_streak} />
            <StatTile icon={Library} label="Words learned" value={data.stats.words} />
            <StatTile icon={Languages} tone="emerald" label="Languages" value={data.stats.by_language.length} />
          </div>

          {incoming.length > 0 && (
            <Link to="/challenges" className="card flex items-center gap-3 !p-4 transition hover:border-brand-300">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                <MessageSquarePlus size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">New challenge from {partnerName}</p>
                <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                  {incoming[0].prompt}{incoming.length > 1 ? ` (+${incoming.length - 1} more)` : ''}
                </p>
              </div>
              <ChevronRight size={18} className="text-stone-400" />
            </Link>
          )}

          <Card>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Today's word</p>
              {t && <LangBadge code={t.word.lang} />}
            </div>
            {t ? (
              <>
                <h2 className="mt-2 text-3xl font-bold capitalize tracking-tight">{t.word.word}</h2>
                {t.word.pronunciation && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t.word.pronunciation}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill done={Boolean(t.mine)} label="You" />
                  <Pill done={theyAnswered} label={partner?.name ?? 'Partner'} />
                </div>
                <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{status}</p>
                <Link to="/learn" className="mt-4 block">
                  <Button full variant={t.mine ? 'secondary' : 'primary'}>
                    <BookOpen size={16} /> {done ? 'See both answers' : t.mine ? 'View my answer' : 'Translate'}
                  </Button>
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">No word available in this language yet. An admin can add words in Profile → Word bank.</p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a) => (
              <Link key={a.to} to={a.to} className="card !p-4 transition hover:border-brand-300 active:scale-[0.99]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <a.icon size={18} />
                </span>
                <p className="mt-3 text-sm font-semibold leading-tight">{a.label}</p>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{a.hint}</p>
              </Link>
            ))}
          </div>

          <Card>
            <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
            <ActivityList items={data.activity} />
          </Card>
        </>
      )}
    </div>
  )
}
