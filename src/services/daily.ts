import { supabase } from '@/lib/supabase'
import type { HistoryItem, MarkStatus, TodayState } from '@/types'

export async function getToday(spaceId: string): Promise<TodayState> {
  const { data, error } = await supabase.rpc('get_today', { p_space: spaceId })
  if (error) throw error
  return data as TodayState
}

export async function submitTranslation(
  challengeId: string, answer: string, alt: string | null,
): Promise<{ completed: boolean; streak: number }> {
  const { data, error } = await supabase.rpc('submit_translation', {
    p_challenge_id: challengeId, p_answer: answer, p_answer_alt: alt,
  })
  if (error) throw error
  return data as { completed: boolean; streak: number }
}

export async function markTranslation(translationId: string, status: MarkStatus): Promise<void> {
  const { error } = await supabase.rpc('mark_translation', { p_translation_id: translationId, p_status: status })
  if (error) throw error
}

export async function getHistory(spaceId: string, limit = 40): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from('daily_challenges')
    .select('*, word:daily_words!word_id(*), translations(*)')
    .eq('space_id', spaceId)
    .order('challenge_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as HistoryItem[]
}
