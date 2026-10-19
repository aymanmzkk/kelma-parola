import { supabase } from '@/lib/supabase'
import type { DailyWord, Difficulty } from '@/types'

export interface NewWord {
  word: string
  definition: string
  example_sentence: string
  difficulty: Difficulty
  category: string
  pronunciation: string
}

export async function listWords(): Promise<DailyWord[]> {
  const { data, error } = await supabase.from('daily_words').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DailyWord[]
}

export async function addWord(userId: string, w: NewWord): Promise<void> {
  const { error } = await supabase.from('daily_words').insert({
    word: w.word.trim().toLowerCase(),
    definition: w.definition.trim(),
    example_sentence: w.example_sentence.trim(),
    difficulty: w.difficulty,
    category: w.category.trim().toLowerCase() || 'general',
    pronunciation: w.pronunciation.trim() || null,
    created_by: userId,
  })
  if (error) throw error
}

export async function deleteWord(id: string): Promise<void> {
  const { error } = await supabase.from('daily_words').delete().eq('id', id)
  if (error) throw error
}
