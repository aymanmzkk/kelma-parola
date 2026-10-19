import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export type ProfilePatch = Partial<
  Pick<Profile, 'name' | 'username' | 'avatar' | 'native_lang' | 'learning_lang' | 'other_langs' |
    'notify_daily' | 'notify_challenges' | 'notify_reviews' | 'notify_streak'>
>

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id)
  if (error) throw error
}
