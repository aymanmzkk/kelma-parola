import { supabase } from '@/lib/supabase'
import type { Language } from '@/types'

export async function listLanguages(): Promise<Language[]> {
  const { data, error } = await supabase.from('languages').select('*').eq('is_active', true).order('sort_order')
  if (error) throw error
  return (data ?? []) as Language[]
}
