# Kelma & Parola V2 — Part 1

What changed in this part:

- "Couple" became "Learning space". A user can create, join and switch between several spaces.
- Languages live in a `languages` table (English, Moroccan Darija, Italian, Spanish, French).
  Add a row in Supabase -> Table Editor -> languages to add another language.
- Each space has its own two languages, daily word, vocabulary, challenges, streak, achievements.
- Challenges work between any two languages, plus a "Teach a word" mode.
- Vocabulary stores source and target language, both Darija scripts, pronunciation, difficulty.
- Neutral wording, one icon set (Lucide), calmer design.

Apply:

1. Overlay these files on the project (see the download page for the commands).
2. Delete `src/services/couple.ts` and `src/pages/CoupleSetup.tsx`.
3. Run `supabase/migrations/0003_v2_learning_spaces.sql` ONCE in the Supabase SQL Editor.
4. `npm run dev`, test, then `npm run build` and re-upload `dist`.

New partners (for example a sibling) need to register, so keep
"Allow new users to sign up" turned on in Supabase while they join.

Coming in Part 2: flashcards with spaced repetition, text-to-speech, voice
recordings, notification preferences and updated push functions, Capacitor,
new app icon. The database tables for these already exist after step 3.
