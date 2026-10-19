import { Award, BookOpen, Flame, GraduationCap, Languages, Layers, type LucideIcon } from 'lucide-react'

export interface Milestone {
  key: string
  icon: LucideIcon
  title: string
}

const WORDS = [1, 10, 25, 50, 100, 250, 500, 1000]
const STREAKS = [3, 7, 14, 30, 60, 100, 365]
const TAUGHT = [5, 25, 50, 100]
const REVIEWS = [10, 100, 500]
const LANGS = [3, 5]

/** Keys match check_achievements() in the database. Per-language keys are added dynamically. */
export const BASE_MILESTONES: Milestone[] = [
  ...WORDS.map((n) => ({ key: `words_${n}`, icon: BookOpen, title: n === 1 ? 'First word' : `${n} words learned` })),
  ...STREAKS.map((n) => ({ key: `streak_${n}`, icon: Flame, title: `${n}-day streak` })),
  ...TAUGHT.map((n) => ({ key: `taught_${n}`, icon: GraduationCap, title: `Language teacher: ${n} words exchanged` })),
  ...REVIEWS.map((n) => ({ key: `reviews_${n}`, icon: Layers, title: `${n} reviews` })),
  ...LANGS.map((n) => ({ key: `langs_${n}`, icon: Languages, title: `Multilingual: ${n} languages` })),
]

export function describeMilestone(key: string, langName: (code: string) => string): Milestone {
  const base = BASE_MILESTONES.find((m) => m.key === key)
  if (base) return base
  const m = /^lang_(\d+):(.+)$/.exec(key)
  if (m) return { key, icon: Languages, title: `${m[1]} ${langName(m[2])} words` }
  return { key, icon: Award, title: 'Milestone unlocked' }
}
