import { supabase } from '@/lib/supabase'

export type NotifyKind = 'partner_challenge' | 'challenge_answered' | 'daily_answered' | 'daily_completed'

/** Best effort. The matching Edge Function is updated in Part 2; until then this is a no-op. */
export async function notifyPartner(kind: NotifyKind, spaceId: string, detail?: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: { kind, space_id: spaceId, detail } })
  } catch {
    // push is optional
  }
}
