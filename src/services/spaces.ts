import { supabase } from '@/lib/supabase'
import type { Space } from '@/types'

export async function getMySpaces(): Promise<Space[]> {
  const { data, error } = await supabase.rpc('get_my_spaces')
  if (error) throw error
  return ((data ?? []) as Space[]).map((s) => ({ ...s, members: s.members ?? [] }))
}

export async function createSpace(name: string, myLang: string, theirLang: string): Promise<string> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const { data, error } = await supabase.rpc('create_space', {
    p_name: name, p_my_lang: myLang, p_their_lang: theirLang, p_timezone: timezone,
  })
  if (error) throw error
  return data as string
}

export async function joinSpace(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_space', { p_code: code })
  if (error) throw error
  return data as string
}

export async function leaveSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_space', { p_space: spaceId })
  if (error) throw error
}

export async function setActiveSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('set_active_space', { p_space: spaceId })
  if (error) throw error
}

export type SpacePatch = Partial<Pick<Space, 'name' | 'photo_url' | 'language_a' | 'language_b' | 'common_lang'>>

export async function updateSpace(spaceId: string, patch: SpacePatch): Promise<void> {
  const { error } = await supabase.from('learning_spaces').update(patch).eq('id', spaceId)
  if (error) throw error
}

export async function setMyLanguage(spaceId: string, userId: string, lang: string): Promise<void> {
  const { error } = await supabase.from('space_members').update({ lang }).eq('space_id', spaceId).eq('user_id', userId)
  if (error) throw error
}
