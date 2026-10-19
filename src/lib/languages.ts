import type { Language } from '@/types'

/** Used when a code is not (or not yet) in the languages table, so the UI never breaks. */
export function fallbackLanguage(code: string): Language {
  return {
    id: code, code, name: code.toUpperCase(), native_name: code, direction: 'ltr', flag: null,
    supports_latin: true, supports_arabic: false, tts_code: null, is_active: true, sort_order: 999,
  }
}

/** Languages commonly written in two scripts (e.g. Darija: Arabic script and Latin). */
export function hasTwoScripts(l: Language): boolean {
  return l.supports_latin && l.supports_arabic
}

/** If only the second script was typed, it becomes the main value. */
export function normalizeScripts(main: string, alt: string): { main: string; alt: string | null } {
  const a = main.trim()
  const b = alt.trim()
  if (!a && b) return { main: b, alt: null }
  return { main: a, alt: b || null }
}

export function joinScripts(main: string, alt: string): string {
  const n = normalizeScripts(main, alt)
  return n.alt ? `${n.main} · ${n.alt}` : n.main
}
