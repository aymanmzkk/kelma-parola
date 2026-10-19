-- Kelma & Parola V2: learning spaces + dynamic languages.
-- Run ONCE in the Supabase SQL Editor. One transaction: if any statement fails, nothing changes.
begin;

do $$ begin
  if to_regclass('public.learning_spaces') is not null then raise exception 'This migration was already applied.'; end if;
  if to_regclass('public.couples') is null then raise exception 'Run 0001_schema.sql first.'; end if;
end $$;

-- ============================================================ 1. LANGUAGES
create table public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  native_name text not null,
  direction text not null default 'ltr' check (direction in ('ltr', 'rtl')),
  flag text,
  supports_latin boolean not null default true,
  supports_arabic boolean not null default false,
  tts_code text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
insert into public.languages (code, name, native_name, direction, flag, supports_latin, supports_arabic, tts_code, sort_order) values
  ('en', 'English', 'English', 'ltr', '🇬🇧', true, false, 'en-GB', 10),
  ('ary', 'Moroccan Darija', 'الدارجة', 'rtl', '🇲🇦', true, true, 'ar-MA', 20),
  ('it', 'Italian', 'Italiano', 'ltr', '🇮🇹', true, false, 'it-IT', 30),
  ('es', 'Spanish', 'Español', 'ltr', '🇪🇸', true, false, 'es-ES', 40),
  ('fr', 'French', 'Français', 'ltr', '🇫🇷', true, false, 'fr-FR', 50);

-- ============================================================ 2. DROP OLD POLICIES + FUNCTIONS
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists couples_select on public.couples;
drop policy if exists couples_update on public.couples;
drop policy if exists daily_challenges_select on public.daily_challenges;
drop policy if exists translations_select on public.translations;
drop policy if exists partner_challenges_select on public.partner_challenges;
drop policy if exists vocabulary_select on public.vocabulary;
drop policy if exists vocabulary_insert on public.vocabulary;
drop policy if exists vocabulary_update on public.vocabulary;
drop policy if exists vocabulary_delete on public.vocabulary;
drop policy if exists streaks_select on public.streaks;
drop policy if exists achievements_select on public.achievements;
drop policy if exists activity_select on public.activity;

drop function if exists public.get_partner_challenges();
drop function if exists public.get_couple_stats();
drop function if exists public.get_today();
drop function if exists public.submit_translation(uuid, text);
drop function if exists public.mark_translation(uuid, text);
drop function if exists public.send_partner_challenge(text, text);
drop function if exists public.answer_partner_challenge(uuid, text);
drop function if exists public.mark_partner_challenge(uuid, text);
drop function if exists public.create_couple(text, text);
drop function if exists public.join_couple(text);
drop function if exists public.check_achievements(uuid);
drop function if exists public.can_see_translation(uuid, uuid);
drop function if exists public.couple_today(uuid);
drop function if exists public.my_couple_id();

-- ============================================================ 3. COUPLES -> LEARNING SPACES
alter table public.couples rename to learning_spaces;
alter table public.learning_spaces
  add column language_a text references public.languages (code),
  add column language_b text references public.languages (code),
  add column common_lang text not null default 'en' references public.languages (code),
  add column max_members integer not null default 2;

alter table public.profiles rename column couple_id to active_space_id;
alter table public.daily_challenges rename column couple_id to space_id;
alter table public.translations rename column couple_id to space_id;
alter table public.partner_challenges rename column couple_id to space_id;
alter table public.vocabulary rename column couple_id to space_id;
alter table public.streaks rename column couple_id to space_id;
alter table public.achievements rename column couple_id to space_id;
alter table public.activity rename column couple_id to space_id;
update public.activity set type = 'space_created' where type = 'couple_created';

-- ============================================================ 4. LANGUAGE NAMES -> LANGUAGE CODES
alter table public.profiles alter column native_language drop default, alter column target_language drop default;
update public.profiles set
  native_language = case native_language when 'darija' then 'ary' when 'italian' then 'it' else 'en' end,
  target_language = case target_language when 'darija' then 'ary' when 'italian' then 'it' else 'en' end,
  avatar = case when avatar = '🙂' then '' else avatar end;
alter table public.profiles rename column native_language to native_lang;
alter table public.profiles rename column target_language to learning_lang;
alter table public.profiles
  alter column native_lang set default 'en',
  alter column learning_lang set default 'en',
  alter column avatar set default '',
  add column other_langs text[] not null default '{}',
  add column notify_daily boolean not null default true,
  add column notify_challenges boolean not null default true,
  add column notify_reviews boolean not null default true,
  add column notify_streak boolean not null default true,
  add constraint profiles_native_lang_fkey foreign key (native_lang) references public.languages (code),
  add constraint profiles_learning_lang_fkey foreign key (learning_lang) references public.languages (code);

update public.translations set language = case language when 'darija' then 'ary' when 'italian' then 'it' else 'en' end;
alter table public.translations rename column language to lang;
alter table public.translations
  add column answer_alt text,
  add constraint translations_lang_fkey foreign key (lang) references public.languages (code);

update public.partner_challenges set
  sender_language = case sender_language when 'darija' then 'ary' when 'italian' then 'it' else 'en' end,
  receiver_language = case receiver_language when 'darija' then 'ary' when 'italian' then 'it' else 'en' end;
alter table public.partner_challenges rename column english_word to prompt;
alter table public.partner_challenges rename column sender_language to sender_answer_lang;
alter table public.partner_challenges rename column receiver_language to target_lang;
alter table public.partner_challenges
  add column kind text not null default 'translate' check (kind in ('translate', 'teach')),
  add column source_lang text not null default 'en' references public.languages (code),
  add column prompt_alt text,
  add column explanation text,
  add column audio_path text,
  add constraint partner_challenges_answer_lang_fkey foreign key (sender_answer_lang) references public.languages (code),
  add constraint partner_challenges_target_lang_fkey foreign key (target_lang) references public.languages (code);

update public.vocabulary set language = case language when 'darija' then 'ary' when 'italian' then 'it' else 'en' end;
alter table public.vocabulary rename column english_word to word;
alter table public.vocabulary rename column language to target_lang;
alter table public.vocabulary
  add column source_lang text not null default 'en' references public.languages (code),
  add column word_alt text,
  add column translation_alt text,
  add column pronunciation text,
  add column difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  add column origin text not null default 'manual' check (origin in ('manual', 'daily', 'challenge', 'teach')),
  add column audio_path text,
  add constraint vocabulary_target_lang_fkey foreign key (target_lang) references public.languages (code);

alter table public.daily_words add column lang text not null default 'en' references public.languages (code);
drop index if exists public.daily_words_word_key;
create unique index daily_words_word_key on public.daily_words (lang, lower(word));

-- ============================================================ 5. MEMBERS + REVIEWS
create table public.space_members (
  space_id uuid not null references public.learning_spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lang text not null references public.languages (code),
  points integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on public.space_members (user_id);

insert into public.space_members (space_id, user_id, lang, points)
select active_space_id, id, native_lang, points from public.profiles where active_space_id is not null;

update public.learning_spaces s set
  language_a = coalesce(
    (select m.lang from public.space_members m where m.space_id = s.id and m.user_id = s.created_by),
    (select m.lang from public.space_members m where m.space_id = s.id limit 1), 'en'),
  language_b = coalesce(
    (select m.lang from public.space_members m where m.space_id = s.id and m.user_id is distinct from s.created_by limit 1),
    (select p.learning_lang from public.profiles p where p.id = s.created_by), 'en');
alter table public.learning_spaces alter column language_a set not null, alter column language_b set not null;

create table public.reviews (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  space_id uuid not null references public.learning_spaces (id) on delete cascade,
  review_count integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  interval_days integer not null default 0,
  difficulty text not null default 'good' check (difficulty in ('easy', 'good', 'hard')),
  last_reviewed timestamptz,
  next_review timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);
create index reviews_due_idx on public.reviews (user_id, space_id, next_review);

-- ============================================================ 6. HELPERS
create function public.is_space_member(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.space_members where space_id = p_space and user_id = auth.uid())
$$;

create function public.shares_space(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.space_members a join public.space_members b on b.space_id = a.space_id
    where a.user_id = auth.uid() and b.user_id = p_user)
$$;

create function public.space_today(p_space uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.learning_spaces where id = p_space), 'UTC'))::date
$$;

create function public.can_see_translation(p_challenge uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
    or exists (select 1 from public.translations t where t.challenge_id = p_challenge and t.user_id = auth.uid())
    or exists (select 1 from public.daily_challenges c where c.id = p_challenge and c.challenge_date < public.space_today(c.space_id))
$$;

-- The language a member answers the daily word in: their own language, or, when that
-- is the same as the daily word's language, the other language of the space.
create function public.member_answer_lang(p_space uuid, p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when m.lang <> s.common_lang then m.lang
              when s.language_a <> s.common_lang then s.language_a
              when s.language_b <> s.common_lang then s.language_b
              else m.lang end
  from public.space_members m join public.learning_spaces s on s.id = m.space_id
  where m.space_id = p_space and m.user_id = p_user
$$;

create or replace function public.generate_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from learning_spaces where invite_code = code);
  end loop;
  return code;
end $$;

create function public.unlock_achievement(p_space uuid, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into achievements (space_id, key) values (p_space, p_key) on conflict (space_id, key) do nothing;
  if found then
    insert into activity (space_id, user_id, type, detail) values (p_space, auth.uid(), 'achievement', p_key);
  end if;
end $$;

create function public.check_achievements(p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_words integer; v_taught integer; v_streak integer; v_reviews integer; v_langs integer;
  n integer; r record;
begin
  select count(*), count(*) filter (where origin in ('teach', 'challenge')), count(distinct target_lang)
    into v_words, v_taught, v_langs from vocabulary where space_id = p_space;
  select longest_streak into v_streak from streaks where space_id = p_space;
  select coalesce(sum(review_count), 0) into v_reviews from reviews where space_id = p_space;

  foreach n in array array[1, 10, 25, 50, 100, 250, 500, 1000] loop
    if v_words >= n then perform unlock_achievement(p_space, 'words_' || n); end if;
  end loop;
  foreach n in array array[3, 7, 14, 30, 60, 100, 365] loop
    if coalesce(v_streak, 0) >= n then perform unlock_achievement(p_space, 'streak_' || n); end if;
  end loop;
  foreach n in array array[5, 25, 50, 100] loop
    if v_taught >= n then perform unlock_achievement(p_space, 'taught_' || n); end if;
  end loop;
  foreach n in array array[10, 100, 500] loop
    if v_reviews >= n then perform unlock_achievement(p_space, 'reviews_' || n); end if;
  end loop;
  foreach n in array array[3, 5] loop
    if v_langs >= n then perform unlock_achievement(p_space, 'langs_' || n); end if;
  end loop;
  for r in select target_lang, count(*) as c from vocabulary where space_id = p_space group by target_lang loop
    foreach n in array array[25, 50, 100, 250] loop
      if r.c >= n then perform unlock_achievement(p_space, 'lang_' || n || ':' || r.target_lang); end if;
    end loop;
  end loop;
end $$;

-- ============================================================ 7. SIGN-UP TRIGGER
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_username text; v_first boolean;
  v_native text; v_learning text; v_other text[] := '{}';
begin
  v_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 60);
  v_username := left(lower(regexp_replace(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g')), 30);
  if char_length(v_username) < 2 then v_username := 'user' || v_username; end if;
  if exists (select 1 from profiles where username = v_username) then
    v_username := v_username || '_' || substr(md5(random()::text), 1, 4);
  end if;
  select not exists (select 1 from profiles) into v_first;
  v_native := coalesce((select code from languages where code = new.raw_user_meta_data ->> 'native_lang'), 'en');
  v_learning := coalesce((select code from languages where code = new.raw_user_meta_data ->> 'learning_lang'), 'en');
  if jsonb_typeof(new.raw_user_meta_data -> 'other_langs') = 'array' then
    select coalesce(array_agg(l.code), '{}') into v_other from languages l
    where l.code in (select jsonb_array_elements_text(new.raw_user_meta_data -> 'other_langs'));
  end if;

  insert into profiles (id, email, name, username, avatar, native_lang, learning_lang, other_langs, is_admin)
  values (new.id, new.email, v_name, v_username, '', v_native, v_learning, v_other, v_first);
  return new;
end $$;

-- ============================================================ 8. SPACE RPCs
create function public.create_space(p_name text, p_my_lang text, p_their_lang text, p_timezone text default 'UTC') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from languages where code = p_my_lang and is_active)
     or not exists (select 1 from languages where code = p_their_lang and is_active) then
    raise exception 'Please choose both languages';
  end if;
  if p_my_lang = p_their_lang then raise exception 'Choose two different languages'; end if;
  select name into v_tz from pg_timezone_names where name = p_timezone;

  insert into learning_spaces (name, invite_code, timezone, created_by, language_a, language_b)
  values (left(coalesce(nullif(trim(p_name), ''), 'Learning space'), 60), generate_invite_code(),
          coalesce(v_tz, 'UTC'), v_uid, p_my_lang, p_their_lang)
  returning id into v_id;

  insert into space_members (space_id, user_id, lang) values (v_id, v_uid, p_my_lang);
  insert into streaks (space_id) values (v_id);
  update profiles set active_space_id = v_id where id = v_uid;
  insert into activity (space_id, user_id, type) values (v_id, v_uid, 'space_created');
  return v_id;
end $$;

create function public.join_space(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_space learning_spaces;
  v_count integer;
  v_lang text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_space from learning_spaces where invite_code = upper(trim(p_code)) for update;
  if not found then raise exception 'That invitation code is not valid'; end if;
  if exists (select 1 from space_members where space_id = v_space.id and user_id = v_uid) then
    raise exception 'You are already in this learning space';
  end if;
  select count(*) into v_count from space_members where space_id = v_space.id;
  if v_count >= v_space.max_members then raise exception 'This learning space is already full'; end if;

  -- The newcomer takes the language of the space nobody has taken yet.
  select case when exists (select 1 from space_members where space_id = v_space.id and lang = v_space.language_b)
              then v_space.language_a else v_space.language_b end into v_lang;
  insert into space_members (space_id, user_id, lang) values (v_space.id, v_uid, v_lang);
  update profiles set active_space_id = v_space.id where id = v_uid;
  insert into activity (space_id, user_id, type) values (v_space.id, v_uid, 'joined');
  return v_space.id;
end $$;

create function public.leave_space(p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from space_members where space_id = p_space and user_id = auth.uid();
  if not found then raise exception 'You are not a member of this learning space'; end if;
  update profiles set active_space_id =
    (select space_id from space_members where user_id = auth.uid() order by joined_at desc limit 1)
  where id = auth.uid();
  if not exists (select 1 from space_members where space_id = p_space) then
    delete from learning_spaces where id = p_space;
  end if;
end $$;

create function public.set_active_space(p_space uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_space_member(p_space) then raise exception 'You are not a member of this learning space'; end if;
  update profiles set active_space_id = p_space where id = auth.uid();
end $$;

create function public.get_my_spaces() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.created_at), '[]'::jsonb)
  from (
    select s.created_at, to_jsonb(s) || jsonb_build_object('members', (
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'lang', m.lang, 'points', m.points, 'joined_at', m.joined_at,
        'name', p.name, 'username', p.username, 'avatar', p.avatar) order by m.joined_at)
      from public.space_members m join public.profiles p on p.id = m.user_id
      where m.space_id = s.id)) as j
    from public.learning_spaces s
    where exists (select 1 from public.space_members me where me.space_id = s.id and me.user_id = auth.uid())
  ) x
$$;

-- ============================================================ 9. DAILY WORD RPCs
create function public.get_today(p_space uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_space learning_spaces;
  v_date date;
  v_ch daily_challenges;
  v_word_id uuid;
  v_mine translations;
  v_others jsonb := '[]'::jsonb;
  v_answered integer;
  v_members integer;
begin
  if not is_space_member(p_space) then raise exception 'You are not a member of this learning space'; end if;
  select * into v_space from learning_spaces where id = p_space;
  v_date := space_today(p_space);

  select * into v_ch from daily_challenges where space_id = p_space and challenge_date = v_date;
  if not found then
    select w.id into v_word_id from daily_words w
    where w.lang = v_space.common_lang
      and not exists (select 1 from daily_challenges c where c.space_id = p_space and c.word_id = w.id)
    order by random() limit 1;

    if v_word_id is null then
      select w.id into v_word_id from daily_words w
      left join daily_challenges c on c.word_id = w.id and c.space_id = p_space
      where w.lang = v_space.common_lang
      group by w.id order by max(c.challenge_date) asc nulls first limit 1;
    end if;
    if v_word_id is null then raise exception 'The word bank has no words in this language yet.'; end if;

    insert into daily_challenges (space_id, word_id, challenge_date) values (p_space, v_word_id, v_date)
    on conflict (space_id, challenge_date) do nothing;
    select * into v_ch from daily_challenges where space_id = p_space and challenge_date = v_date;
  end if;

  select * into v_mine from translations where challenge_id = v_ch.id and user_id = v_uid;
  select count(*) into v_answered from translations where challenge_id = v_ch.id;
  select count(*) into v_members from space_members where space_id = p_space;
  if v_mine.id is not null then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) into v_others
    from translations t where t.challenge_id = v_ch.id and t.user_id <> v_uid;
  end if;

  return jsonb_build_object(
    'challenge', to_jsonb(v_ch),
    'word', (select to_jsonb(w) from daily_words w where w.id = v_ch.word_id),
    'mine', case when v_mine.id is null then null else to_jsonb(v_mine) end,
    'others', v_others,
    'answered_count', v_answered,
    'member_count', v_members,
    'answer_lang', member_answer_lang(p_space, v_uid));
end $$;

create function public.submit_translation(p_challenge_id uuid, p_answer text, p_answer_alt text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ch daily_challenges;
  v_today date;
  v_word text;
  v_count integer;
  v_members integer;
  v_streak integer := 0;
  v_done boolean := false;
begin
  select * into v_ch from daily_challenges where id = p_challenge_id for update;
  if not found or not is_space_member(v_ch.space_id) then raise exception 'Challenge not found'; end if;
  v_today := space_today(v_ch.space_id);
  if v_ch.challenge_date <> v_today then raise exception 'This challenge is over. Open today''s word instead.'; end if;
  if nullif(trim(p_answer), '') is null then raise exception 'Please enter a translation'; end if;
  if exists (select 1 from translations where challenge_id = v_ch.id and user_id = v_uid) then
    raise exception 'You already answered today''s word';
  end if;
  select word into v_word from daily_words where id = v_ch.word_id;

  insert into translations (challenge_id, space_id, user_id, word_id, answer, answer_alt, lang)
  values (v_ch.id, v_ch.space_id, v_uid, v_ch.word_id, left(trim(p_answer), 200),
          nullif(left(trim(coalesce(p_answer_alt, '')), 200), ''), member_answer_lang(v_ch.space_id, v_uid));
  update space_members set points = points + 5 where space_id = v_ch.space_id and user_id = v_uid;
  insert into activity (space_id, user_id, type, detail) values (v_ch.space_id, v_uid, 'daily_answered', v_word);

  select count(*) into v_count from translations where challenge_id = v_ch.id;
  select count(*) into v_members from space_members where space_id = v_ch.space_id;

  if v_count >= greatest(v_members, 2) and v_ch.completed_at is null then
    v_done := true;
    update daily_challenges set completed_at = now() where id = v_ch.id;

    insert into streaks (space_id) values (v_ch.space_id) on conflict (space_id) do nothing;
    update streaks set
      current_streak = case when last_completed_date = v_today - 1 then current_streak + 1 else 1 end,
      longest_streak = greatest(longest_streak, case when last_completed_date = v_today - 1 then current_streak + 1 else 1 end),
      days_completed = days_completed + 1,
      last_completed_date = v_today,
      updated_at = now()
    where space_id = v_ch.space_id and (last_completed_date is null or last_completed_date < v_today);
    select current_streak into v_streak from streaks where space_id = v_ch.space_id;

    -- Every translation of the day becomes a shared vocabulary entry (and a flashcard).
    insert into vocabulary (space_id, added_by, word, source_lang, translation, translation_alt, target_lang, pronunciation, example_sentence, origin)
    select t.space_id, t.user_id, w.word, w.lang, t.answer, t.answer_alt, t.lang, w.pronunciation, nullif(w.example_sentence, ''), 'daily'
    from translations t join daily_words w on w.id = t.word_id
    where t.challenge_id = v_ch.id;

    insert into activity (space_id, user_id, type, detail) values (v_ch.space_id, v_uid, 'daily_completed', v_word);
    perform check_achievements(v_ch.space_id);
  end if;

  return jsonb_build_object('completed', v_done, 'streak', coalesce(v_streak, 0));
end $$;

create function public.mark_translation(p_translation_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_t translations;
  v_points integer;
begin
  if p_status not in ('correct', 'almost', 'incorrect') then raise exception 'Invalid status'; end if;
  select * into v_t from translations where id = p_translation_id and user_id = auth.uid() for update;
  if not found then raise exception 'Translation not found'; end if;
  if not exists (select 1 from daily_challenges where id = v_t.challenge_id and completed_at is not null) then
    raise exception 'Both answers must be in before you can mark yours';
  end if;
  v_points := case p_status when 'correct' then 10 when 'almost' then 5 else 0 end;
  update translations set status = p_status, points_awarded = v_points where id = v_t.id;
  update space_members set points = points + v_points - v_t.points_awarded
  where space_id = v_t.space_id and user_id = v_t.user_id;
end $$;

-- ============================================================ 10. CHALLENGES (translate + teach)
create function public.send_challenge(
  p_space uuid, p_kind text, p_source_lang text, p_prompt text, p_target_lang text, p_answer text, p_answer_lang text,
  p_prompt_alt text default null, p_explanation text default null, p_receiver uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_receiver uuid;
  v_id uuid;
begin
  if not is_space_member(p_space) then raise exception 'You are not a member of this learning space'; end if;
  if p_kind not in ('translate', 'teach') then raise exception 'Invalid challenge type'; end if;
  select user_id into v_receiver from space_members
  where space_id = p_space and user_id <> v_uid and (p_receiver is null or user_id = p_receiver)
  order by joined_at limit 1;
  if v_receiver is null then raise exception 'Your learning partner has not joined yet'; end if;
  if nullif(trim(p_prompt), '') is null or nullif(trim(p_answer), '') is null then
    raise exception 'The word and your answer are both required';
  end if;
  if (select count(*) from languages where code in (p_source_lang, p_target_lang, p_answer_lang)) <
     (select count(distinct c) from unnest(array[p_source_lang, p_target_lang, p_answer_lang]) as c) then
    raise exception 'Unknown language';
  end if;

  insert into partner_challenges (space_id, sender_id, receiver_id, kind, source_lang, prompt, prompt_alt,
                                  target_lang, sender_answer, sender_answer_lang, explanation)
  values (p_space, v_uid, v_receiver, p_kind, p_source_lang, left(trim(p_prompt), 80),
          nullif(left(trim(coalesce(p_prompt_alt, '')), 80), ''), p_target_lang, left(trim(p_answer), 200),
          p_answer_lang, nullif(left(trim(coalesce(p_explanation, '')), 500), ''))
  returning id into v_id;

  update space_members set points = points + 2 where space_id = p_space and user_id = v_uid;
  insert into activity (space_id, user_id, type, detail)
  values (p_space, v_uid, case p_kind when 'teach' then 'teach_sent' else 'challenge_sent' end, left(trim(p_prompt), 80));
  return v_id;
end $$;

create function public.answer_challenge(p_id uuid, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_c partner_challenges;
  v_answer text := left(trim(coalesce(p_answer, '')), 200);
begin
  select * into v_c from partner_challenges where id = p_id and receiver_id = auth.uid() for update;
  if not found then raise exception 'Challenge not found'; end if;
  if v_c.status = 'answered' then raise exception 'You already answered this challenge'; end if;
  if v_answer = '' then raise exception 'Please enter an answer'; end if;

  update partner_challenges set receiver_answer = v_answer, status = 'answered', answered_at = now() where id = p_id;

  -- Save what was learned. The sender's answer is the reference; when both answered in
  -- different languages, both versions are kept.
  insert into vocabulary (space_id, added_by, word, word_alt, source_lang, translation, target_lang, note, origin)
  values (v_c.space_id, v_c.sender_id, v_c.prompt, v_c.prompt_alt, v_c.source_lang, v_c.sender_answer,
          v_c.sender_answer_lang, v_c.explanation, case v_c.kind when 'teach' then 'teach' else 'challenge' end);
  if v_c.kind = 'translate' and v_c.sender_answer_lang <> v_c.target_lang then
    insert into vocabulary (space_id, added_by, word, word_alt, source_lang, translation, target_lang, origin)
    values (v_c.space_id, v_c.receiver_id, v_c.prompt, v_c.prompt_alt, v_c.source_lang, v_answer, v_c.target_lang, 'challenge');
  end if;

  insert into activity (space_id, user_id, type, detail) values (v_c.space_id, v_c.receiver_id, 'challenge_answered', v_c.prompt);
  perform check_achievements(v_c.space_id);
end $$;

create function public.mark_challenge(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_c partner_challenges;
  v_points integer;
begin
  if p_status not in ('correct', 'almost', 'incorrect') then raise exception 'Invalid status'; end if;
  select * into v_c from partner_challenges where id = p_id and receiver_id = auth.uid() for update;
  if not found then raise exception 'Challenge not found'; end if;
  if v_c.status <> 'answered' then raise exception 'Answer the challenge first'; end if;
  v_points := case p_status when 'correct' then 10 when 'almost' then 5 else 0 end;
  update partner_challenges set receiver_status = p_status, points_awarded = v_points where id = p_id;
  update space_members set points = points + v_points - v_c.points_awarded
  where space_id = v_c.space_id and user_id = v_c.receiver_id;
end $$;

-- The receiver never gets the answer or the explanation while the challenge is pending.
create function public.get_challenges(p_space uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    case when c.receiver_id = auth.uid() and c.status = 'pending'
         then to_jsonb(c) || jsonb_build_object('sender_answer', null, 'explanation', null)
         else to_jsonb(c) end
    order by c.created_at desc), '[]'::jsonb)
  from (
    select * from public.partner_challenges
    where space_id = p_space and public.is_space_member(p_space)
    order by created_at desc limit 300
  ) c
$$;

-- ============================================================ 11. STATS + REVIEWS
create function public.get_space_stats(p_space uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_s streaks;
  v_words integer; v_by_me integer; v_to_me integer; v_due integer;
  v_reviews integer; v_correct integer; v_incorrect integer;
  v_by_lang jsonb; v_monthly jsonb; v_days jsonb;
begin
  if not is_space_member(p_space) then raise exception 'You are not a member of this learning space'; end if;
  v_today := space_today(p_space);
  select * into v_s from streaks where space_id = p_space;

  select count(*),
         count(*) filter (where origin in ('teach', 'challenge') and added_by = v_uid),
         count(*) filter (where origin in ('teach', 'challenge') and added_by <> v_uid)
    into v_words, v_by_me, v_to_me
  from vocabulary where space_id = p_space;

  select coalesce(sum(review_count), 0), coalesce(sum(correct_count), 0), coalesce(sum(incorrect_count), 0)
    into v_reviews, v_correct, v_incorrect
  from reviews where space_id = p_space and user_id = v_uid;

  select count(*) into v_due
  from vocabulary v left join reviews r on r.vocabulary_id = v.id and r.user_id = v_uid
  where v.space_id = p_space and (r.next_review is null or r.next_review <= now());

  select coalesce(jsonb_agg(jsonb_build_object('lang', q.target_lang, 'count', q.c) order by q.c desc), '[]'::jsonb)
    into v_by_lang
  from (select target_lang, count(*) as c from vocabulary where space_id = p_space group by target_lang) q;

  select coalesce(jsonb_agg(jsonb_build_object('month', q.ym, 'count', q.cnt) order by q.ym), '[]'::jsonb)
    into v_monthly
  from (
    select to_char(m, 'YYYY-MM') as ym,
      (select count(*) from vocabulary v
        where v.space_id = p_space and to_char(v.created_at, 'YYYY-MM') = to_char(m, 'YYYY-MM')) as cnt
    from generate_series(date_trunc('month', v_today::timestamp) - interval '5 months',
                         date_trunc('month', v_today::timestamp), interval '1 month') as m
  ) q;

  select coalesce(jsonb_agg(challenge_date order by challenge_date), '[]'::jsonb) into v_days
  from daily_challenges
  where space_id = p_space and completed_at is not null
    and to_char(challenge_date, 'YYYY-MM') = to_char(v_today, 'YYYY-MM');

  return jsonb_build_object(
    'today', v_today,
    'current_streak', case when v_s.last_completed_date >= v_today - 1 then v_s.current_streak else 0 end,
    'longest_streak', coalesce(v_s.longest_streak, 0),
    'days_completed', coalesce(v_s.days_completed, 0),
    'completed_today', coalesce(v_s.last_completed_date = v_today, false),
    'words', v_words,
    'taught_by_me', v_by_me,
    'taught_to_me', v_to_me,
    'reviews', v_reviews,
    'accuracy', case when v_correct + v_incorrect > 0 then round(100.0 * v_correct / (v_correct + v_incorrect)) end,
    'due', v_due,
    'by_language', v_by_lang,
    'monthly', v_monthly,
    'month_days', v_days);
end $$;

create function public.get_due_cards(p_space uuid, p_limit integer default 20) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb)
  from (
    select v.*, r.review_count, r.interval_days, r.next_review
    from public.vocabulary v
    left join public.reviews r on r.vocabulary_id = v.id and r.user_id = auth.uid()
    where v.space_id = p_space and public.is_space_member(p_space)
      and (r.next_review is null or r.next_review <= now())
    order by r.next_review asc nulls first, v.created_at desc
    limit greatest(1, least(p_limit, 100))
  ) q
$$;

-- Simple spaced repetition: hard = tomorrow, good = interval x2, easy = interval x3.
create function public.review_card(p_vocab uuid, p_rating text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_space uuid;
  v_prev integer;
  v_int integer;
begin
  if p_rating not in ('easy', 'good', 'hard') then raise exception 'Invalid rating'; end if;
  select space_id into v_space from vocabulary where id = p_vocab;
  if v_space is null or not is_space_member(v_space) then raise exception 'Word not found'; end if;
  select coalesce(interval_days, 0) into v_prev from reviews where user_id = v_uid and vocabulary_id = p_vocab;
  v_prev := coalesce(v_prev, 0);
  v_int := least(180, case p_rating when 'hard' then 1 when 'good' then greatest(2, v_prev * 2) else greatest(4, v_prev * 3) end);

  insert into reviews (user_id, vocabulary_id, space_id, review_count, correct_count, incorrect_count,
                       interval_days, difficulty, last_reviewed, next_review)
  values (v_uid, p_vocab, v_space, 1, (p_rating <> 'hard')::int, (p_rating = 'hard')::int,
          v_int, p_rating, now(), now() + make_interval(days => v_int))
  on conflict (user_id, vocabulary_id) do update set
    review_count = reviews.review_count + 1,
    correct_count = reviews.correct_count + excluded.correct_count,
    incorrect_count = reviews.incorrect_count + excluded.incorrect_count,
    interval_days = excluded.interval_days,
    difficulty = excluded.difficulty,
    last_reviewed = excluded.last_reviewed,
    next_review = excluded.next_review;
  perform check_achievements(v_space);
end $$;

-- ============================================================ 12. VOCABULARY TRIGGER + BACKFILL
create or replace function public.on_vocabulary_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.origin = 'manual' then
    insert into activity (space_id, user_id, type, detail) values (new.space_id, new.added_by, 'word_added', new.word);
    perform check_achievements(new.space_id);
  end if;
  return new;
end $$;

-- Words you already learned in V1 become vocabulary entries.
insert into public.vocabulary (space_id, added_by, word, source_lang, translation, target_lang, pronunciation, origin, created_at)
select t.space_id, t.user_id, w.word, w.lang, t.answer, t.lang, w.pronunciation, 'daily', t.created_at
from public.translations t
join public.daily_challenges c on c.id = t.challenge_id
join public.daily_words w on w.id = c.word_id
where c.completed_at is not null;

insert into public.vocabulary (space_id, added_by, word, source_lang, translation, target_lang, origin, created_at)
select space_id, sender_id, prompt, source_lang, sender_answer, sender_answer_lang, 'challenge', answered_at
from public.partner_challenges where status = 'answered'
union all
select space_id, receiver_id, prompt, source_lang, receiver_answer, target_lang, 'challenge', answered_at
from public.partner_challenges where status = 'answered' and receiver_answer is not null;

-- ============================================================ 13. ROW LEVEL SECURITY
alter table public.languages enable row level security;
alter table public.space_members enable row level security;
alter table public.reviews enable row level security;

create policy languages_select on public.languages for select to anon, authenticated using (true);
create policy languages_admin on public.languages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_space(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy spaces_select on public.learning_spaces for select to authenticated
  using (public.is_space_member(id));
create policy spaces_update on public.learning_spaces for update to authenticated
  using (public.is_space_member(id)) with check (public.is_space_member(id));

create policy members_select on public.space_members for select to authenticated
  using (public.is_space_member(space_id));
create policy members_update on public.space_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy daily_challenges_select on public.daily_challenges for select to authenticated
  using (public.is_space_member(space_id));
create policy translations_select on public.translations for select to authenticated
  using (public.is_space_member(space_id) and public.can_see_translation(challenge_id, user_id));
create policy partner_challenges_select on public.partner_challenges for select to authenticated
  using (public.is_space_member(space_id) and (sender_id = auth.uid() or status = 'answered'));

create policy vocabulary_select on public.vocabulary for select to authenticated
  using (public.is_space_member(space_id));
create policy vocabulary_insert on public.vocabulary for insert to authenticated
  with check (public.is_space_member(space_id) and added_by = auth.uid());
create policy vocabulary_update on public.vocabulary for update to authenticated
  using (added_by = auth.uid() and public.is_space_member(space_id))
  with check (added_by = auth.uid() and public.is_space_member(space_id));
create policy vocabulary_delete on public.vocabulary for delete to authenticated
  using (added_by = auth.uid() and public.is_space_member(space_id));

create policy streaks_select on public.streaks for select to authenticated using (public.is_space_member(space_id));
create policy achievements_select on public.achievements for select to authenticated using (public.is_space_member(space_id));
create policy activity_select on public.activity for select to authenticated using (public.is_space_member(space_id));
create policy reviews_select on public.reviews for select to authenticated using (user_id = auth.uid());

-- ============================================================ 14. GRANTS
revoke all on public.languages, public.space_members, public.reviews from anon, authenticated;
grant select on public.languages to anon, authenticated;
grant insert, update, delete on public.languages to authenticated;
grant select on public.space_members, public.reviews to authenticated;
grant update (lang) on public.space_members to authenticated;
grant all on public.languages, public.space_members, public.reviews to service_role;

grant update (name, username, avatar, native_lang, learning_lang, other_langs,
              notify_daily, notify_challenges, notify_reviews, notify_streak) on public.profiles to authenticated;
grant update (name, photo_url, language_a, language_b, common_lang) on public.learning_spaces to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_admin(),
  public.is_space_member(uuid),
  public.shares_space(uuid),
  public.space_today(uuid),
  public.can_see_translation(uuid, uuid),
  public.member_answer_lang(uuid, uuid),
  public.create_space(text, text, text, text),
  public.join_space(text),
  public.leave_space(uuid),
  public.set_active_space(uuid),
  public.get_my_spaces(),
  public.get_today(uuid),
  public.submit_translation(uuid, text, text),
  public.mark_translation(uuid, text),
  public.send_challenge(uuid, text, text, text, text, text, text, text, text, uuid),
  public.answer_challenge(uuid, text),
  public.mark_challenge(uuid, text),
  public.get_challenges(uuid),
  public.get_space_stats(uuid),
  public.get_due_cards(uuid, integer),
  public.review_card(uuid, text)
to authenticated;
grant execute on all functions in schema public to service_role;

-- ============================================================ 15. STORAGE FOR VOICE RECORDINGS (used in Part 2)
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "recordings read by space members" on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and public.is_space_member(((storage.foldername(name))[1])::uuid));
create policy "recordings insert by space members" on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings'
    and public.is_space_member(((storage.foldername(name))[1])::uuid)
    and (storage.foldername(name))[2] = auth.uid()::text);
create policy "recordings delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[2] = auth.uid()::text);

commit;
