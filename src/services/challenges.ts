import { supabase } from '@/lib/supabase'
import type { Challenge, ChallengeKind, MarkStatus } from '@/types'

export interface NewChallenge {
  spaceId: string
  kind: ChallengeKind
  sourceLang: string
  prompt: string
  promptAlt: string | null
  targetLang: string
  answer: string
  answerLang: string
  explanation: string
}

export async function listChallenges(spaceId: string): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('get_challenges', { p_space: spaceId })
  if (error) throw error
  return (data ?? []) as Challenge[]
}

export async function sendChallenge(c: NewChallenge): Promise<void> {
  const { error } = await supabase.rpc('send_challenge', {
    p_space: c.spaceId, p_kind: c.kind, p_source_lang: c.sourceLang, p_prompt: c.prompt,
    p_target_lang: c.targetLang, p_answer: c.answer, p_answer_lang: c.answerLang,
    p_prompt_alt: c.promptAlt, p_explanation: c.explanation || null,
  })
  if (error) throw error
}

export async function answerChallenge(id: string, answer: string): Promise<void> {
  const { error } = await supabase.rpc('answer_challenge', { p_id: id, p_answer: answer })
  if (error) throw error
}

export async function markChallenge(id: string, status: MarkStatus): Promise<void> {
  const { error } = await supabase.rpc('mark_challenge', { p_id: id, p_status: status })
  if (error) throw error
}
