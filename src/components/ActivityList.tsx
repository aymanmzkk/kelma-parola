import {
  CheckCircle2, GraduationCap, MessagesSquare, Pencil, Plus, Send, Sparkles, Trophy, UserPlus, Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { describeMilestone } from '@/lib/milestones'
import { timeAgo } from '@/lib/utils'
import type { Activity } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  space_created: Users,
  joined: UserPlus,
  daily_answered: Pencil,
  daily_completed: CheckCircle2,
  challenge_sent: Send,
  teach_sent: GraduationCap,
  challenge_answered: MessagesSquare,
  word_added: Plus,
  achievement: Trophy,
}

export default function ActivityList({ items }: { items: Activity[] }) {
  const { profile, space, lang } = useAuth()
  if (items.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Nothing yet. Start with today's word.</p>
  }

  const describe = (a: Activity): string => {
    const who = a.user_id === profile?.id ? 'You' : (space?.members.find((m) => m.user_id === a.user_id)?.name ?? 'Your partner')
    const word = a.detail ? `“${a.detail}”` : ''
    switch (a.type) {
      case 'space_created': return `${who} created this learning space`
      case 'joined': return `${who} joined the space`
      case 'daily_answered': return `${who} translated ${word}`
      case 'daily_completed': return `Today's word ${word} is complete`
      case 'challenge_sent': return `${who} sent a challenge: ${word}`
      case 'teach_sent': return `${who} is teaching a word: ${word}`
      case 'challenge_answered': return `${who} answered ${word}`
      case 'word_added': return `${who} added ${word} to the vocabulary`
      case 'achievement': return `Milestone: ${describeMilestone(a.detail ?? '', (c) => lang(c).name).title}`
      default: return 'New activity'
    }
  }

  return (
    <ul className="space-y-3.5">
      {items.map((a) => {
        const Icon = ICONS[a.type] ?? Sparkles
        return (
          <li key={a.id} className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-900/5 text-stone-500 dark:bg-white/10 dark:text-stone-300">
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{describe(a)}</p>
              <p className="text-xs text-stone-400">{timeAgo(a.created_at)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
