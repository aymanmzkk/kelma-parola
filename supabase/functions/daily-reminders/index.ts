// Called on a schedule (see supabase/optional/push_cron.sql), protected by a shared secret.
import { adminClient, json, sendToUsers } from '../_shared/push.ts'

Deno.serve(async (req: Request) => {
  try {
    const secret = Deno.env.get('CRON_SECRET')
    if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as { kind?: string }
    const db = adminClient()

    const { data: couples, error: couplesError } = await db.from('couples').select('id, timezone')
    if (couplesError) throw couplesError
    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('id, couple_id')
      .not('couple_id', 'is', null)
    if (profilesError) throw profilesError

    const members = (profiles ?? []) as { id: string; couple_id: string }[]

    if (body.kind === 'streak') {
      // Only people who have not answered today's word yet.
      const pending: string[] = []
      for (const c of (couples ?? []) as { id: string; timezone: string }[]) {
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: c.timezone || 'UTC' }).format(new Date())
        const ids = members.filter((m) => m.couple_id === c.id).map((m) => m.id)
        const { data: challenge } = await db
          .from('daily_challenges')
          .select('id')
          .eq('couple_id', c.id)
          .eq('challenge_date', date)
          .maybeSingle()
        let answered: string[] = []
        if (challenge) {
          const { data: rows } = await db.from('translations').select('user_id').eq('challenge_id', challenge.id)
          answered = ((rows ?? []) as { user_id: string }[]).map((r) => r.user_id)
        }
        pending.push(...ids.filter((id) => !answered.includes(id)))
      }
      const sent = await sendToUsers(db, pending, {
        title: "🔥 Don't lose your streak!",
        body: "Today's word is still waiting for you.",
        url: '/learn',
        tag: 'streak',
      })
      return json({ sent })
    }

    const sent = await sendToUsers(
      db,
      members.map((m) => m.id),
      { title: "🌍 Today's word is ready!", body: 'Open the app and discover it together.', url: '/learn', tag: 'daily' },
    )
    return json({ sent })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
