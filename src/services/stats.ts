import { supabase } from '@/lib/supabase'
import type { Achievement, Activity, SpaceStats } from '@/types'

export async function getStats(spaceId: string): Promise<SpaceStats> {
  const { data, error } = await supabase.rpc('get_space_stats', { p_space: spaceId })
  if (error) throw error
  return data as SpaceStats
}

export async function getActivity(spaceId: string, limit = 10): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as Activity[]
}

export async function getAchievements(spaceId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements').select('*').eq('space_id', spaceId).order('unlocked_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Achievement[]
}
