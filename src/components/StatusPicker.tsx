import { CheckCircle2, CircleDashed, RotateCcw, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnswerStatus, MarkStatus } from '@/types'

const OPTIONS: { value: MarkStatus; label: string; icon: LucideIcon; points: string }[] = [
  { value: 'correct', label: 'I knew it', icon: CheckCircle2, points: '+10' },
  { value: 'almost', label: 'Almost', icon: CircleDashed, points: '+5' },
  { value: 'incorrect', label: 'Not yet', icon: RotateCcw, points: '+0' },
]

export default function StatusPicker({ value, onChange, disabled }: { value: AnswerStatus; onChange: (s: MarkStatus) => void; disabled?: boolean }) {
  return (
    <div>
      <p className="label">How did you do?</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-medium transition active:scale-[0.97] disabled:opacity-60',
              value === o.value
                ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200'
                : 'border-stone-300 hover:bg-stone-50 dark:border-white/15 dark:hover:bg-white/5',
            )}
          >
            <o.icon size={18} />
            <span>
              {o.label} <span className="text-xs font-normal text-stone-400">{o.points}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
