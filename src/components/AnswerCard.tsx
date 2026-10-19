import { CheckCircle2, CircleDashed, RotateCcw } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { LangBadge, WordText } from '@/components/Lang'
import type { AnswerStatus } from '@/types'

interface AnswerCardProps {
  person: { name?: string | null; avatar?: string | null } | null
  langCode: string
  answer?: string | null
  alt?: string | null
  status?: AnswerStatus
  waiting?: boolean
}

export default function AnswerCard({ person, langCode, answer, alt, status, waiting }: AnswerCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-stone-900/[0.04] p-3.5 dark:bg-white/5">
      <Avatar value={person?.avatar} name={person?.name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-500 dark:text-stone-400">
          {person?.name ?? 'Learning partner'}
          {langCode && <LangBadge code={langCode} />}
        </p>
        {waiting ? (
          <p className="mt-1 text-sm text-stone-400">Not answered yet</p>
        ) : (
          <p className="mt-1 text-lg font-semibold leading-snug">
            <WordText text={answer} alt={alt} />
          </p>
        )}
      </div>
      {status === 'correct' && <CheckCircle2 size={18} className="shrink-0 text-emerald-500" aria-label="Knew it" />}
      {status === 'almost' && <CircleDashed size={18} className="shrink-0 text-amber-500" aria-label="Almost" />}
      {status === 'incorrect' && <RotateCcw size={18} className="shrink-0 text-stone-400" aria-label="To review" />}
    </div>
  )
}
