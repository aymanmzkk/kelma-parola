import { supabase } from '@/lib/supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'enabled' | 'disabled'
export type PushKind = 'partner_challenge' | 'challenge_answered' | 'daily_answered' | 'daily_completed'

function supported(): boolean {
  return (
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  )
}

function toKey(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

/** The service worker only exists in the built app (npm run build / deployed), not in "npm run dev". */
async function registration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(
      () => reject(new Error('Notifications only work in the deployed app (https), not in “npm run dev”.')),
      5000,
    ),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return 'unsupported'
  if (!VAPID) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return sub && Notification.permission === 'granted' ? 'enabled' : 'disabled'
}

export async function enablePush(userId: string): Promise<void> {
  if (!supported()) throw new Error('This browser does not support notifications.')
  if (!VAPID) throw new Error('Push is not configured yet (VITE_VAPID_PUBLIC_KEY is missing).')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID) }))
  const keys = sub.toJSON().keys ?? {}
  if (!keys.p256dh || !keys.auth) throw new Error('This device returned an incomplete subscription.')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function disablePush(): Promise<void> {
  if (!supported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Best effort: the app keeps working if the Edge Function is not deployed. */
export async function notifyPartner(kind: PushKind, detail?: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: { kind, detail } })
  } catch (e) {
    console.warn('Push not sent', e)
  }
}

export async function sendTestPush(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-push', { body: { kind: 'test' } })
  if (error) throw new Error('The send-push function did not answer. Is it deployed?')
  if (!data || (data as { sent?: number }).sent === 0) {
    throw new Error('The server has no working subscription for this device. Turn notifications off and on again.')
  }
}
