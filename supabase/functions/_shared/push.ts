import webpush from 'npm:web-push@3.6.7'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Works with a secret you set yourself (SB_SECRET_KEY), the legacy service role key,
// or the new SUPABASE_SECRET_KEYS variable that the platform injects.
function secretKey(): string {
  const direct = Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (direct) return direct
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>
    const first = keys.default ?? Object.values(keys)[0]
    if (typeof first === 'string') return first
  } catch (_e) {
    // fall through
  }
  throw new Error('No Supabase secret key found. Set the SB_SECRET_KEY function secret.')
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/** Sends a notification to every device of the given users. Returns how many were delivered. */
export async function sendToUsers(db: SupabaseClient, userIds: string[], payload: PushPayload): Promise<number> {
  if (userIds.length === 0) return 0
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) throw new Error('VAPID keys are not configured.')
  const vapidDetails = {
    subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    publicKey,
    privateKey,
  }

  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (error) throw error

  let sent = 0
  await Promise.all(
    (subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        // web-push does the encryption + VAPID signature; fetch does the request.
        const details = webpush.generateRequestDetails(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { vapidDetails, TTL: 60 * 60 * 24 },
        )
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(details.headers as Record<string, unknown>)) {
          if (k.toLowerCase() !== 'content-length') headers[k] = String(v)
        }
        const res = await fetch(details.endpoint, { method: 'POST', headers, body: details.body })
        if (res.ok) {
          sent++
        } else if (res.status === 404 || res.status === 410) {
          // The device unsubscribed: forget it.
          await db.from('push_subscriptions').delete().eq('id', s.id)
        } else {
          console.error('Push rejected', res.status, await res.text())
        }
      } catch (e) {
        console.error('Push failed', e)
      }
    }),
  )
  return sent
}
