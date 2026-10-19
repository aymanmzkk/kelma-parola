import { supabase } from '@/lib/supabase'
import type { Difficulty, VocabularyEntry } from '@/types'

export interface NewVocabulary {
  source_lang: string
  word: string
  word_alt: string | null
  target_lang: string
  translation: string
  translation_alt: string | null
  pronunciation: string
  example_sentence: string
  note: string
  difficulty: Difficulty
}

export async function listVocabulary(spaceId: string): Promise<VocabularyEntry[]> {
  const { data, error } = await supabase
    .from('vocabulary').select('*').eq('space_id', spaceId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as VocabularyEntry[]
}

export async function addVocabulary(spaceId: string, userId: string, v: NewVocabulary): Promise<void> {
  const { error } = await supabase.from('vocabulary').insert({
    space_id: spaceId,
    added_by: userId,
    source_lang: v.source_lang,
    word: v.word,
    word_alt: v.word_alt,
    target_lang: v.target_lang,
    translation: v.translation,
    translation_alt: v.translation_alt,
    pronunciation: v.pronunciation.trim() || null,
    example_sentence: v.example_sentence.trim() || null,
    note: v.note.trim() || null,
    difficulty: v.difficulty,
    origin: 'manual',
  })
  if (error) throw error
}

export async function deleteVocabulary(id: string): Promise<void> {
  const { error } = await supabase.from('vocabulary').delete().eq('id', id)
  if (error) throw error
}
