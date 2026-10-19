import {
  useEffect,
  type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- Buttons ---------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
  loading?: boolean
  full?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10',
  ghost: 'text-stone-600 hover:bg-stone-900/5 dark:text-stone-300 dark:hover:bg-white/10',
  danger:
    'border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10',
}

export function Button({ variant = 'primary', size = 'md', loading = false, full = false, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'min-h-[44px] px-4 text-sm' : 'min-h-[36px] px-3 text-xs',
        VARIANTS[variant],
        full && 'w-full',
        className,
      )}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-800 active:scale-95 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------- Surfaces ---------- */

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('card', className)}>
      {children}
    </div>
  )
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-stone-900 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Form fields ---------- */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Field({ label, hint, className, ...rest }: FieldProps) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <input {...rest} className={cn('input', className)} />
      {hint && <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">{hint}</span>}
    </label>
  )
}

export function TextArea({ label, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <textarea rows={2} {...rest} className={cn('input resize-none', className)} />
    </label>
  )
}

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <select {...rest} className={cn('input', className)}>
        {children}
      </select>
    </label>
  )
}

export function Chip({ active = false, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'min-h-[36px] whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition active:scale-[0.97]',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------- Feedback ---------- */

export function Spinner({ small = false }: { small?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        small ? 'h-4 w-4' : 'mx-auto my-10 block h-6 w-6 text-brand-500',
      )}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-stone-200/80 dark:bg-white/10', className)} />
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  )
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner />
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center dark:border-white/15">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-stone-900/5 text-stone-500 dark:bg-white/10 dark:text-stone-300">
        <Icon size={22} />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Layout helpers ---------- */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function StatTile({ icon: Icon, label, value, tone = 'brand' }: { icon: LucideIcon; label: string; value: ReactNode; tone?: 'brand' | 'amber' | 'emerald' }) {
  const tones = {
    brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  }
  return (
    <div className="card !p-4">
      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
        <Icon size={18} />
      </span>
      <p className="mt-3 text-2xl font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  )
}
