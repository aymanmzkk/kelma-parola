# Kelma & Parola

> 🚧 En desarrollo · Proyecto personal de [Ayman Mouzakki](https://github.com/aymanmzkk)

App web instalable (PWA) para aprender idiomas en pareja o en grupo. Cada día aparece
una palabra en inglés; cada persona la traduce a su idioma (darija, italiano, español,
francés…) y las respuestas solo se revelan cuando todos han contestado.

**Funcionalidades**

- Registro e inicio de sesión con Supabase Auth
- "Espacios de aprendizaje": crear, unirse con un código de 6 caracteres y cambiar entre varios
- Palabra del día, retos entre idiomas, vocabulario guardado, racha compartida y logros
- Avatares, tema claro/oscuro y notificaciones push
- Seguridad a nivel de fila (RLS) en PostgreSQL para que cada usuario solo vea sus espacios

**Tecnologías:** React 18 · TypeScript · Vite · Tailwind CSS · React Router ·
Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) · PWA

---

A private, installable language app for two. One English word a day; each of you
translates it into your own language (Darija / Italian); answers are revealed
only when both have submitted.

Stack: React + Vite + TypeScript + Tailwind, Supabase (auth, database, realtime,
storage, edge functions), installable as a PWA.

## Quick start (Windows PowerShell)

1. Install Node.js: `winget install OpenJS.NodeJS.LTS` (then reopen PowerShell).
   If npm says "running scripts is disabled":
   `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
2. In this folder: `npm install`
3. Create a project at https://supabase.com
4. Supabase dashboard -> SQL Editor -> New query: paste and run
   `supabase/migrations/0001_schema.sql` (once), then
   `supabase/migrations/0002_seed_words.sql`.
5. Authentication -> Email provider: turn off "Confirm email" (simplest).
6. `Copy-Item .env.example .env` then `notepad .env` and fill in:
   - VITE_SUPABASE_URL (Project Settings -> Data API -> Project URL)
   - VITE_SUPABASE_PUBLISHABLE_KEY (Project Settings -> API Keys -> Publishable key)
7. `npm run dev` and open http://localhost:5173

## Test with two accounts

Use a normal window and an incognito window. Account 1: register, "Create our
space", note the 6-character code. Account 2: register, enter the code.

## Build and deploy

- `npm run build` creates `dist/`. Values from `.env` are baked in at build time.
- Easiest deploy: drag the `dist` folder onto https://app.netlify.com/drop
- Or: `npx vercel`, add the env variables in the Vercel dashboard, `npx vercel --prod`
- Then set Supabase -> Authentication -> URL Configuration -> Site URL to your
  online address.

## Install on phones

- Android: open the site in Chrome -> menu -> "Add to Home screen" / "Install app".
- iPhone: open the site in Safari -> Share -> "Add to Home Screen".

## Push notifications (optional)

1. `npx web-push generate-vapid-keys`
2. Put the public key in `.env` as VITE_VAPID_PUBLIC_KEY, rebuild, redeploy.
3. Deploy the functions (replace the placeholders):

       npx supabase login
       npx supabase link --project-ref YOUR_PROJECT_REF
       npx supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:you@example.com" SB_SECRET_KEY="sb_secret_..." CRON_SECRET="a-long-random-string"
       npx supabase functions deploy send-push --no-verify-jwt --use-api
       npx supabase functions deploy daily-reminders --no-verify-jwt --use-api

4. On each phone: Profile -> Notifications -> Enable. On iPhone this only works
   on iOS 16.4+ and from the Home Screen icon.
5. Optional scheduled reminders: edit and run `supabase/optional/push_cron.sql`.

## Keep it private

Once both accounts exist, turn off "Allow new users to sign up" in Supabase
Authentication settings.

## Notes

- `npm run build` does not run the type checker; `npm run typecheck` does.
- The streak is shared: it grows only on days when both of you answer.
- App icons are generated automatically by `scripts/generate-icons.mjs`.
