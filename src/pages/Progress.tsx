import { CalendarCheck, Flame, GraduationCap, Layers, Library, Target, Trophy } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { Card, ErrorNote, PageHeader, SkeletonList, StatTile } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { getAchievements, getStats } from '@/services/stats'
import { BASE_MILESTONES, describeMilestone } from '@/lib/milestones'
import { cn, monthLabel } from '@/lib/utils'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Progress() {
  const { profile, space, version, lang } = useAuth()
  const spaceId = space?.id ?? ''
  const { data, loading, error } = useAsync(async () => {
    if (!spaceId) return null
    const [stats, achievements] = await Promise.all([getStats(spaceId), getAchievements(spaceId)])
    return { stats, achievements }
  }, [version, spaceId])

  if (!profile || !space) return null
  if (loading) return <SkeletonList rows={4} />
  if (error || !data) return <ErrorNote message={error ?? 'Could not load your progress.'} />

  const { stats, achievements } = data
  const unlocked = new Set(achievements.map((a) => a.key))
  const extra = achievements.filter((a) => !BASE_MILESTONES.some((m) => m.key === a.key))
    .map((a) => describeMilestone(a.key, (c) => lang(c).name))
  const milestones = [...extra, ...BASE_MILESTONES]
  const maxMonth = Math.max(1, ...stats.monthly.map((m) => m.count))
  const maxLang = Math.max(1, ...stats.by_language.map((l) => l.count))

  const [year, month, todayDay] = stats.today.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const completedDays = new Set(stats.month_days.map((d) => Number(d.slice(8, 10))))
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <PageHeader title="Progress" subtitle={`Your learning progress in ${space.name}.`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Flame} tone="amber" label="Current streak" value={stats.current_streak} />
        <StatTile icon={Trophy} tone="amber" label="Longest streak" value={stats.longest_streak} />
        <StatTile icon={Library} label="Words learned" value={stats.words} />
        <StatTile icon={Layers} label="Words reviewed" value={stats.reviews} />
        <StatTile icon={GraduationCap} tone="emerald" label="Words I taught" value={stats.taught_by_me} />
        <StatTile icon={Target} tone="emerald" label="Review accuracy" value={stats.accuracy === null ? '–' : `${stats.accuracy}%`} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold">Words by language</h2>
        {stats.by_language.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">No words yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stats.by_language.map((l) => (
              <li key={l.lang}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{lang(l.lang).name}</span>
                  <span className="text-stone-500 dark:text-stone-400">{l.count} words</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-900/5 dark:bg-white/10">
                  <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${Math.max(4, (l.count / maxLang) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Last six months</h2>
        <div className="mt-4 flex items-end gap-2">
          {stats.monthly.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-semibold">{m.count}</span>
              <div className="w-full rounded-t-lg bg-brand-500 transition-all duration-500" style={{ height: `${4 + Math.round((m.count / maxMonth) * 88)}px` }} />
              <span className="text-[11px] text-stone-500 dark:text-stone-400">{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold capitalize">{monthName}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <CalendarCheck size={14} /> {stats.days_completed} days completed
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs">
          {WEEKDAYS.map((d, i) => <span key={`h${i}`} className="text-stone-400">{d}</span>)}
          {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <span key={day} className={cn('grid aspect-square place-items-center rounded-full font-medium',
              completedDays.has(day) ? 'bg-brand-600 text-white' : 'bg-stone-900/5 text-stone-500 dark:bg-white/5 dark:text-stone-400',
              day === todayDay && 'ring-2 ring-brand-400 ring-offset-2 ring-offset-white dark:ring-offset-stone-900')}>
              {day}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Achievements</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">{unlocked.size} unlocked</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {milestones.map((m) => {
            const on = unlocked.has(m.key)
            return (
              <li key={m.key} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm',
                on ? 'border-brand-200 bg-brand-500/5 font-medium dark:border-brand-400/30' : 'border-stone-200 text-stone-400 dark:border-white/10')}>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full',
                  on ? 'bg-brand-600 text-white' : 'bg-stone-900/5 dark:bg-white/10')}>
                  <m.icon size={15} />
                </span>
                {m.title}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Points</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {space.members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 rounded-xl bg-stone-900/[0.04] p-3 dark:bg-white/5">
              <Avatar value={m.avatar} name={m.name} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.user_id === profile.id ? 'You' : m.name}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{m.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
