// Called by the app after an action, with the signed-in user's token.
// It only ever notifies the caller's own partner (or the caller, for "test").
import { adminClient, corsHeaders, json, sendToUsers, type PushPayload } from '../_shared/push.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const db = adminClient()
    const { data: auth, error: authError } = await db.auth.getUser(token)
    if (authError || !auth?.user) return json({ error: 'Unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as { kind?: string; detail?: string }
    const word = String(body.detail ?? '').slice(0, 80)

    const { data: me } = await db
      .from('profiles')
      .select('id, name, couple_id')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (!me) return json({ error: 'Profile not found' }, 404)

    if (body.kind === 'test') {
      const sent = await sendToUsers(db, [me.id], {
        title: '🔔 Notifications are working',
        body: 'You will hear from us when your partner is active.',
        url: '/',
        tag: 'test',
      })
      return json({ sent })
    }

    if (!me.couple_id) return json({ sent: 0 })
    const { data: partner } = await db
      .from('profiles')
      .select('id')
      .eq('couple_id', me.couple_id)
      .neq('id', me.id)
      .maybeSingle()
    if (!partner) return json({ sent: 0 })

    const messages: Record<string, PushPayload> = {
      partner_challenge: {
        title: `💌 ${me.name} sent you a challenge!`,
        body: word ? `Translate: ${word}` : 'Open the app to answer.',
        url: '/challenges',
        tag: 'challenge',
      },
      challenge_answered: {
        title: `✅ ${me.name} answered your challenge`,
        body: word ? `See how they translated “${word}”.` : 'Open the app to see the answer.',
        url: '/challenges',
        tag: 'challenge',
      },
      daily_answered: {
        title: `💬 ${me.name} translated today's word`,
        body: 'Your turn — both answers unlock when you reply.',
        url: '/learn',
        tag: 'daily',
      },
      daily_completed: {
        title: `❤️ You and ${me.name} learned a new word together!`,
        body: word ? `“${word}” — see both translations.` : 'See both translations.',
        url: '/learn',
        tag: 'daily',
      },
    }
    const payload = messages[body.kind ?? '']
    if (!payload) return json({ error: 'Unknown notification kind' }, 400)

    return json({ sent: await sendToUsers(db, [partner.id], payload) })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
