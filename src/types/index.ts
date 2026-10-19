export type AnswerStatus = 'pending' | 'correct' | 'almost' | 'incorrect'
export type MarkStatus = Exclude<AnswerStatus, 'pending'>
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ChallengeKind = 'translate' | 'teach'
export type VocabOrigin = 'manual' | 'daily' | 'challenge' | 'teach'

/** A row of the `languages` table. Add rows there to support more languages. */
export interface Language {
  id: string
  code: string
  name: string
  native_name: string
  direction: 'ltr' | 'rtl'
  flag: string | null
  supports_latin: boolean
  supports_arabic: boolean
  tts_code: string | null
  is_active: boolean
  sort_order: number
}

export interface Profile {
  id: string
  email: string
  name: string
  username: string
  avatar: string
  native_lang: string
  learning_lang: string
  other_langs: string[]
  active_space_id: string | null
  is_admin: boolean
  notify_daily: boolean
  notify_challenges: boolean
  notify_reviews: boolean
  notify_streak: boolean
  created_at: string
}

export interface SpaceMember {
  user_id: string
  /** The language this person brings to this space. */
  lang: string
  points: number
  joined_at: string
  name: string
  username: string
  avatar: string
}

export interface Space {
  id: string
  name: string
  photo_url: string | null
  invite_code: string
  timezone: string
  created_by: string | null
  created_at: string
  language_a: string
  language_b: string
  /** Language of the daily word. */
  common_lang: string
  max_members: number
  members: SpaceMember[]
}

export interface DailyWord {
  id: string
  word: string
  definition: string
  example_sentence: string
  difficulty: Difficulty
  category: string
  pronunciation: string | null
  lang: string
  created_at: string
}

export interface DailyChallenge {
  id: string
  space_id: string
  word_id: string
  challenge_date: string
  completed_at: string | null
  created_at: string
}

export interface Translation {
  id: string
  challenge_id: string
  space_id: string
  user_id: string
  word_id: string
  answer: string
  answer_alt: string | null
  lang: string
  status: AnswerStatus
  points_awarded: number
  created_at: string
}

export interface TodayState {
  challenge: DailyChallenge
  word: DailyWord
  mine: Translation | null
  /** Other members' answers. Empty until you have answered. */
  others: Translation[]
  answered_count: number
  member_count: number
  /** The language you answer in. */
  answer_lang: string
}

export interface HistoryItem extends DailyChallenge {
  word: DailyWord
  translations: Translation[]
}

export interface Challenge {
  id: string
  space_id: string
  sender_id: string
  receiver_id: string
  kind: ChallengeKind
  source_lang: string
  prompt: string
  prompt_alt: string | null
  target_lang: string
  /** null for the receiver while pending */
  sender_answer: string | null
  sender_answer_lang: string
  explanation: string | null
  receiver_answer: string | null
  status: 'pending' | 'answered'
  receiver_status: AnswerStatus
  points_awarded: number
  audio_path: string | null
  created_at: string
  answered_at: string | null
}

export interface VocabularyEntry {
  id: string
  space_id: string
  added_by: string
  word: string
  word_alt: string | null
  source_lang: string
  translation: string
  translation_alt: string | null
  target_lang: string
  pronunciation: string | null
  example_sentence: string | null
  note: string | null
  difficulty: Difficulty
  origin: VocabOrigin
  audio_path: string | null
  created_at: string
}

export interface Activity {
  id: string
  space_id: string
  user_id: string | null
  type: string
  detail: string | null
  created_at: string
}

export interface Achievement {
  id: string
  space_id: string
  key: string
  unlocked_at: string
}

export interface SpaceStats {
  today: string
  current_streak: number
  longest_streak: number
  days_completed: number
  completed_today: boolean
  words: number
  taught_by_me: number
  taught_to_me: number
  reviews: number
  accuracy: number | null
  due: number
  by_language: { lang: string; count: number }[]
  monthly: { month: string; count: number }[]
  month_days: string[]
}
