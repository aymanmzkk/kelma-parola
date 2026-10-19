import { cn, isImageUrl } from '@/lib/utils'

interface AvatarProps {
  /** Photo URL. Legacy emoji avatars still render. Empty = initials. */
  value?: string | null
  name?: string | null
  size?: number
  className?: string
}

export default function Avatar({ value, name, size = 40, className }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (isImageUrl(value)) {
    return <img src={value} alt="" style={style} className={cn('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-stone-900', className)} />
  }
  const initials = (name ?? '').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?'
  return (
    <span
      style={style}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold leading-none text-brand-700 ring-2 ring-white dark:bg-brand-500/25 dark:text-brand-100 dark:ring-stone-900',
        className,
      )}
    >
      {value || initials}
    </span>
  )
}
