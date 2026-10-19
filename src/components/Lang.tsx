import { ArrowLeftRight } from 'lucide-react'
import { Field, Select } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { hasTwoScripts } from '@/lib/languages'
import { cn } from '@/lib/utils'

/** A language shown as a short code tag plus its name. Codes, not flags: languages are not countries. */
export function LangBadge({ code, showName = true, className }: { code: string; showName?: boolean; className?: string }) {
  const { lang } = useAuth()
  const l = lang(code)
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300', className)}>
      <span className="rounded-md border border-stone-300 px-1.5 py-[3px] font-mono text-[10px] font-semibold uppercase leading-none tracking-wide dark:border-white/20">
        {l.code}
      </span>
      {showName && l.name}
    </span>
  )
}

export function LangPair({ a, b, showNames = false, className }: { a: string; b: string; showNames?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <LangBadge code={a} showName={showNames} />
      <ArrowLeftRight size={12} className="text-stone-400" />
      <LangBadge code={b} showName={showNames} />
    </span>
  )
}

interface LangSelectProps {
  label: string
  value: string
  onChange: (code: string) => void
  /** Limit the options to these codes. */
  only?: string[]
  required?: boolean
  placeholder?: string
}

export function LangSelect({ label, value, onChange, only, required, placeholder }: LangSelectProps) {
  const { languages } = useAuth()
  const options = only ? languages.filter((l) => only.includes(l.code)) : languages
  return (
    <Select label={label} value={value} required={required} onChange={(e) => onChange(e.target.value)}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name} — {l.native_name}
        </option>
      ))}
    </Select>
  )
}

interface ScriptFieldsProps {
  code: string
  label: string
  value: string
  alt: string
  onChange: (value: string, alt: string) => void
  required?: boolean
  maxLength?: number
}

/** One input, or two for languages written in both Latin and Arabic script (Darija). */
export function ScriptFields({ code, label, value, alt, onChange, required, maxLength = 200 }: ScriptFieldsProps) {
  const { lang } = useAuth()
  const l = lang(code)
  if (!hasTwoScripts(l)) {
    return (
      <Field label={label} dir="auto" required={required} maxLength={maxLength} autoComplete="off"
        value={value} onChange={(e) => onChange(e.target.value, '')} />
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={`${label} · Latin letters`} placeholder="zwin" maxLength={maxLength} autoComplete="off"
        required={required && !alt.trim()} value={value} onChange={(e) => onChange(e.target.value, alt)} />
      <Field label={`${label} · Arabic script`} dir="rtl" placeholder="زوين" maxLength={maxLength} autoComplete="off"
        required={required && !value.trim()} value={alt} onChange={(e) => onChange(value, e.target.value)} />
    </div>
  )
}

/** A word with its optional second script. */
export function WordText({ text, alt, className }: { text: string | null | undefined; alt?: string | null; className?: string }) {
  return (
    <span dir="auto" className={cn('break-words', className)}>
      {text}
      {alt && <span className="text-stone-400"> · {alt}</span>}
    </span>
  )
}
