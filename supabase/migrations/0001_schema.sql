-- Kelma & Parola — schema, security and business logic.
-- Run ONCE in the Supabase SQL Editor (it is not written to be re-run).

-- ============================================================ TABLES

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Us' check (char_length(name) between 1 and 60),
  photo_url text,
  invite_code text not null unique,
  timezone text not null default 'UTC',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 1 and 60),
  username text not null unique check (char_length(username) between 2 and 40),
  avatar text not null default '🙂',
  native_language text not null default 'darija',
  target_language text not null default 'italian',
  couple_id uuid references public.couples (id) on delete set null,
  points integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index profiles_couple_idx on public.profiles (couple_id);

create table public.daily_words (
  id uuid primary key default gen_random_uuid(),
  word text not null check (char_length(word) between 1 and 80),
  definition text not null,
  example_sentence text not null default '',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  category text not null default 'general',
  pronunciation text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index daily_words_word_key on public.daily_words (lower(word));

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  word_id uuid not null references public.daily_words (id) on delete restrict,
  challenge_date date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (couple_id, challenge_date)
);
create index daily_challenges_word_idx on public.daily_challenges (couple_id, word_id);

create table public.translations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  word_id uuid not null references public.daily_words (id) on delete restrict,
  answer text not null check (char_length(answer) between 1 and 200),
  language text not null,
  status text not null default 'pending' check (status in ('pending', 'correct', 'almost', 'incorrect')),
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- NOTE: get_partner_challenges() depends on this exact column order.
create table public.partner_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  english_word text not null check (char_length(english_word) between 1 and 80),
  sender_answer text not null,
  sender_language text not null,
  receiver_answer text,
  receiver_language text not null,
  status text not null default 'pending' check (status in ('pending', 'answered')),
  receiver_status text not null default 'pending' check (receiver_status in ('pending', 'correct', 'almost', 'incorrect')),
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index partner_challenges_couple_idx on public.partner_challenges (couple_id, created_at desc);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  added_by uuid not null references public.profiles (id) on delete cascade,
  english_word text not null check (char_length(english_word) between 1 and 80),
  translation text not null check (char_length(translation) between 1 and 200),
  language text not null,
  example_sentence text,
  note text,
  created_at timestamptz not null default now()
);
create index vocabulary_couple_idx on public.vocabulary (couple_id, created_at desc);

create table public.streaks (
  couple_id uuid primary key references public.couples (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  days_completed integer not null default 0,
  last_completed_date date,
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null default now(),
  unique (couple_id, key)
);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  type text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index activity_couple_idx on public.activity (couple_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ============================================================ HELPER FUNCTIONS

create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- "Today" in the couple's timezone.
create or replace function public.couple_today(p_couple uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.couples where id = p_couple), 'UTC'))::date
$$;

-- A translation is visible to: its owner; the partner once they have answered the
-- same challenge; and the partner once the day is over.
create or replace function public.can_see_translation(p_challenge uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
    or exists (select 1 from public.translations t where t.challenge_id = p_challenge and t.user_id = auth.uid())
    or exists (select 1 from public.daily_challenges c where c.id = p_challenge and c.challenge_date < public.couple_today(c.couple_id))
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
    exit when not exists (select 1 from couples where invite_code = code);
  end loop;
  return code;
end $$;

create or replace function public.check_achievements(p_couple uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_daily integer;
  v_partner integer;
  v_vocab integer;
  v_streak integer;
  n integer;
begin
  select count(*) into v_daily from daily_challenges where couple_id = p_couple and completed_at is not null;
  select count(*) into v_partner from partner_challenges where couple_id = p_couple and status = 'answered';
  select count(*) into v_vocab from vocabulary where couple_id = p_couple;
  select longest_streak into v_streak from streaks where couple_id = p_couple;

  foreach n in array array[1, 10, 25, 50, 100, 250, 500, 1000] loop
    if v_daily + v_partner + v_vocab >= n then
      insert into achievements (couple_id, key) values (p_couple, 'words_' || n) on conflict (couple_id, key) do nothing;
      if found then insert into activity (couple_id, user_id, type, detail) values (p_couple, auth.uid(), 'achievement', 'words_' || n); end if;
    end if;
  end loop;

  foreach n in array array[3, 7, 14, 30, 60, 100, 365] loop
    if coalesce(v_streak, 0) >= n then
      insert into achievements (couple_id, key) values (p_couple, 'streak_' || n) on conflict (couple_id, key) do nothing;
      if found then insert into activity (couple_id, user_id, type, detail) values (p_couple, auth.uid(), 'achievement', 'streak_' || n); end if;
    end if;
  end loop;

  foreach n in array array[5, 25, 50, 100] loop
    if v_partner + v_vocab >= n then
      insert into achievements (couple_id, key) values (p_couple, 'taught_' || n) on conflict (couple_id, key) do nothing;
      if found then insert into activity (couple_id, user_id, type, detail) values (p_couple, auth.uid(), 'achievement', 'taught_' || n); end if;
    end if;
  end loop;
end $$;

-- ============================================================ SIGN-UP TRIGGER

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_username text;
  v_first boolean;
begin
  v_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 60);
  v_username := lower(regexp_replace(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'));
  v_username := left(v_username, 30);
  if char_length(v_username) < 2 then v_username := 'user' || v_username; end if;
  if exists (select 1 from profiles where username = v_username) then
    v_username := v_username || '_' || substr(md5(random()::text), 1, 4);
  end if;
  -- The very first account becomes the admin (can manage the word bank).
  select not exists (select 1 from profiles) into v_first;

  insert into profiles (id, email, name, username, avatar, native_language, target_language, is_admin)
  values (
    new.id, new.email, v_name, v_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar', ''), '🙂'),
    coalesce(nullif(new.raw_user_meta_data ->> 'native_language', ''), 'darija'),
    coalesce(nullif(new.raw_user_meta_data ->> 'target_language', ''), 'italian'),
    v_first
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================ COUPLE RPCs

create or replace function public.create_couple(p_name text, p_timezone text default 'UTC') returns public.couples
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_couple couples;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if (select couple_id from profiles where id = v_uid) is not null then
    raise exception 'You are already in a couple';
  end if;
  select name into v_tz from pg_timezone_names where name = p_timezone;

  insert into couples (name, invite_code, timezone, created_by)
  values (left(coalesce(nullif(trim(p_name), ''), 'Us'), 60), generate_invite_code(), coalesce(v_tz, 'UTC'), v_uid)
  returning * into v_couple;

  update profiles set couple_id = v_couple.id where id = v_uid;
  insert into streaks (couple_id) values (v_couple.id);
  insert into activity (couple_id, user_id, type) values (v_couple.id, v_uid, 'couple_created');
  return v_couple;
end $$;

create or replace function public.join_couple(p_code text) returns public.couples
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_couple couples;
  v_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if (select couple_id from profiles where id = v_uid) is not null then
    raise exception 'You are already in a couple';
  end if;

  select * into v_couple from couples where invite_code = upper(trim(p_code)) for update;
  if not found then raise exception 'That invitation code is not valid'; end if;

  select count(*) into v_count from profiles where couple_id = v_couple.id;
  if v_count >= 2 then raise exception 'This couple is already complete'; end if;

  -- The partner of an admin can manage the word bank too.
  update profiles
  set couple_id = v_couple.id,
      is_admin = is_admin or exists (select 1 from profiles c where c.id = v_couple.created_by and c.is_admin)
  where id = v_uid;

  insert into activity (couple_id, user_id, type) values (v_couple.id, v_uid, 'joined');
  return v_couple;
end $$;

-- ============================================================ DAILY WORD RPCs

-- Returns today's challenge (creating it if needed) without ever leaking the partner's answer early.
create or replace function public.get_today() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_couple uuid := my_couple_id();
  v_date date;
  v_ch daily_challenges;
  v_word_id uuid;
  v_mine translations;
  v_partner translations;
begin
  if v_couple is null then raise exception 'You are not in a couple yet'; end if;
  v_date := couple_today(v_couple);

  select * into v_ch from daily_challenges where couple_id = v_couple and challenge_date = v_date;
  if not found then
    -- A random word this couple has never had.
    select w.id into v_word_id
    from daily_words w
    where not exists (select 1 from daily_challenges c where c.couple_id = v_couple and c.word_id = w.id)
    order by random() limit 1;

    -- Word bank exhausted: reuse the word seen longest ago.
    if v_word_id is null then
      select w.id into v_word_id
      from daily_words w
      left join daily_challenges c on c.word_id = w.id and c.couple_id = v_couple
      group by w.id
      order by max(c.challenge_date) asc nulls first
      limit 1;
    end if;

    if v_word_id is null then raise exception 'The word bank is empty. Add words first.'; end if;

    insert into daily_challenges (couple_id, word_id, challenge_date)
    values (v_couple, v_word_id, v_date)
    on conflict (couple_id, challenge_date) do nothing;

    select * into v_ch from daily_challenges where couple_id = v_couple and challenge_date = v_date;
  end if;

  select * into v_mine from translations where challenge_id = v_ch.id and user_id = v_uid;
  select * into v_partner from translations where challenge_id = v_ch.id and user_id <> v_uid limit 1;

  return jsonb_build_object(
    'challenge', to_jsonb(v_ch),
    'word', (select to_jsonb(w) from daily_words w where w.id = v_ch.word_id),
    'mine', case when v_mine.id is null then null else to_jsonb(v_mine) end,
    'partner_answered', v_partner.id is not null,
    'partner', case when v_mine.id is not null and v_partner.id is not null then to_jsonb(v_partner) else null end
  );
end $$;

create or replace function public.submit_translation(p_challenge_id uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile profiles;
  v_ch daily_challenges;
  v_today date;
  v_word text;
  v_count integer;
  v_streak integer := 0;
begin
  select * into v_profile from profiles where id = v_uid;
  if v_profile.couple_id is null then raise exception 'You are not in a couple yet'; end if;

  select * into v_ch from daily_challenges
  where id = p_challenge_id and couple_id = v_profile.couple_id for update;
  if not found then raise exception 'Challenge not found'; end if;

  v_today := couple_today(v_ch.couple_id);
  if v_ch.challenge_date <> v_today then raise exception 'This challenge is over. Open today''s word instead.'; end if;
  if nullif(trim(p_answer), '') is null then raise exception 'Please enter a translation'; end if;
  if exists (select 1 from translations where challenge_id = v_ch.id and user_id = v_uid) then
    raise exception 'You already answered today''s word';
  end if;

  select word into v_word from daily_words where id = v_ch.word_id;

  insert into translations (challenge_id, couple_id, user_id, word_id, answer, language)
  values (v_ch.id, v_ch.couple_id, v_uid, v_ch.word_id, left(trim(p_answer), 200), v_profile.native_language);

  update profiles set points = points + 5 where id = v_uid; -- daily challenge bonus
  insert into activity (couple_id, user_id, type, detail) values (v_ch.couple_id, v_uid, 'daily_answered', v_word);

  select count(*) into v_count from translations where challenge_id = v_ch.id;

  if v_count >= 2 and v_ch.completed_at is null then
    update daily_challenges set completed_at = now() where id = v_ch.id;

    insert into streaks (couple_id) values (v_ch.couple_id) on conflict (couple_id) do nothing;
    update streaks set
      current_streak = case when last_completed_date = v_today - 1 then current_streak + 1 else 1 end,
      longest_streak = greatest(longest_streak, case when last_completed_date = v_today - 1 then current_streak + 1 else 1 end),
      days_completed = days_completed + 1,
      last_completed_date = v_today,
      updated_at = now()
    where couple_id = v_ch.couple_id and (last_completed_date is null or last_completed_date < v_today);

    select current_streak into v_streak from streaks where couple_id = v_ch.couple_id;
    insert into activity (couple_id, user_id, type, detail) values (v_ch.couple_id, v_uid, 'daily_completed', v_word);
    perform check_achievements(v_ch.couple_id);
  end if;

  return jsonb_build_object('completed', v_count >= 2, 'streak', coalesce(v_streak, 0));
end $$;

create or replace function public.mark_translation(p_translation_id uuid, p_status text) returns void
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
  update profiles set points = points + v_points - v_t.points_awarded where id = v_t.user_id;
end $$;

-- ============================================================ PARTNER CHALLENGE RPCs

create or replace function public.send_partner_challenge(p_word text, p_answer text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me profiles;
  v_partner profiles;
  v_id uuid;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.couple_id is null then raise exception 'You are not in a couple yet'; end if;
  select * into v_partner from profiles where couple_id = v_me.couple_id and id <> v_me.id limit 1;
  if not found then raise exception 'Your partner has not joined yet'; end if;
  if nullif(trim(p_word), '') is null or nullif(trim(p_answer), '') is null then
    raise exception 'The word and your translation are both required';
  end if;

  insert into partner_challenges (couple_id, sender_id, receiver_id, english_word, sender_answer, sender_language, receiver_language)
  values (v_me.couple_id, v_me.id, v_partner.id, left(trim(p_word), 80), left(trim(p_answer), 200),
          v_me.native_language, v_partner.native_language)
  returning id into v_id;

  update profiles set points = points + 2 where id = v_me.id;
  insert into activity (couple_id, user_id, type, detail) values (v_me.couple_id, v_me.id, 'challenge_sent', left(trim(p_word), 80));
  return v_id;
end $$;

create or replace function public.answer_partner_challenge(p_id uuid, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_c partner_challenges;
begin
  select * into v_c from partner_challenges where id = p_id and receiver_id = auth.uid() for update;
  if not found then raise exception 'Challenge not found'; end if;
  if v_c.status = 'answered' then raise exception 'You already answered this challenge'; end if;
  if nullif(trim(p_answer), '') is null then raise exception 'Please enter a translation'; end if;

  update partner_challenges
  set receiver_answer = left(trim(p_answer), 200), status = 'answered', answered_at = now()
  where id = p_id;

  insert into activity (couple_id, user_id, type, detail) values (v_c.couple_id, v_c.receiver_id, 'challenge_answered', v_c.english_word);
  perform check_achievements(v_c.couple_id);
end $$;

create or replace function public.mark_partner_challenge(p_id uuid, p_status text) returns void
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
  update profiles set points = points + v_points - v_c.points_awarded where id = v_c.receiver_id;
end $$;

-- The receiver never gets the sender's translation while the challenge is pending.
create or replace function public.get_partner_challenges() returns setof public.partner_challenges
language sql stable security definer set search_path = public as $$
  select
    id, couple_id, sender_id, receiver_id, english_word,
    case when receiver_id = auth.uid() and status = 'pending' then null else sender_answer end,
    sender_language, receiver_answer, receiver_language, status, receiver_status, points_awarded,
    created_at, answered_at
  from public.partner_challenges
  where couple_id = public.my_couple_id()
  order by created_at desc
  limit 300
$$;

-- ============================================================ STATS RPC

create or replace function public.get_couple_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_couple uuid := my_couple_id();
  v_today date;
  v_s streaks;
  v_daily integer;
  v_partner integer;
  v_vocab integer;
  v_monthly jsonb;
  v_days jsonb;
begin
  if v_couple is null then return null; end if;
  v_today := couple_today(v_couple);
  select * into v_s from streaks where couple_id = v_couple;
  select count(*) into v_daily from daily_challenges where couple_id = v_couple and completed_at is not null;
  select count(*) into v_partner from partner_challenges where couple_id = v_couple and status = 'answered';
  select count(*) into v_vocab from vocabulary where couple_id = v_couple;

  select coalesce(jsonb_agg(jsonb_build_object('month', q.ym, 'count', q.cnt) order by q.ym), '[]'::jsonb)
  into v_monthly
  from (
    select
      to_char(m, 'YYYY-MM') as ym,
      (select count(*) from daily_challenges d
        where d.couple_id = v_couple and d.completed_at is not null
          and to_char(d.challenge_date, 'YYYY-MM') = to_char(m, 'YYYY-MM'))
      + (select count(*) from partner_challenges p
        where p.couple_id = v_couple and p.status = 'answered'
          and to_char(p.answered_at, 'YYYY-MM') = to_char(m, 'YYYY-MM'))
      + (select count(*) from vocabulary v
        where v.couple_id = v_couple and to_char(v.created_at, 'YYYY-MM') = to_char(m, 'YYYY-MM')) as cnt
    from generate_series(
      date_trunc('month', v_today::timestamp) - interval '5 months',
      date_trunc('month', v_today::timestamp),
      interval '1 month') as m
  ) q;

  select coalesce(jsonb_agg(challenge_date order by challenge_date), '[]'::jsonb)
  into v_days
  from daily_challenges
  where couple_id = v_couple and completed_at is not null
    and to_char(challenge_date, 'YYYY-MM') = to_char(v_today, 'YYYY-MM');

  return jsonb_build_object(
    'today', v_today,
    'current_streak', case when v_s.last_completed_date >= v_today - 1 then v_s.current_streak else 0 end,
    'longest_streak', coalesce(v_s.longest_streak, 0),
    'days_completed', coalesce(v_s.days_completed, 0),
    'completed_today', coalesce(v_s.last_completed_date = v_today, false),
    'words_together', v_daily + v_partner + v_vocab,
    'daily_words', v_daily,
    'partner_words', v_partner,
    'vocab_words', v_vocab,
    'taught', v_partner + v_vocab,
    'monthly', v_monthly,
    'month_days', v_days
  );
end $$;

-- ============================================================ VOCABULARY TRIGGER

create or replace function public.on_vocabulary_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity (couple_id, user_id, type, detail) values (new.couple_id, new.added_by, 'word_added', new.english_word);
  perform check_achievements(new.couple_id);
  return new;
end $$;

create trigger vocabulary_after_insert
  after insert on public.vocabulary
  for each row execute function public.on_vocabulary_insert();

-- ============================================================ ROW LEVEL SECURITY

alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_words enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.translations enable row level security;
alter table public.partner_challenges enable row level security;
alter table public.vocabulary enable row level security;
alter table public.streaks enable row level security;
alter table public.achievements enable row level security;
alter table public.activity enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: me + my partner. I can edit only my own row (and only safe columns, see grants).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (couple_id is not null and couple_id = public.my_couple_id()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- couples: only my own couple. Creating / joining goes through the RPCs.
create policy couples_select on public.couples for select to authenticated
  using (id = public.my_couple_id());
create policy couples_update on public.couples for update to authenticated
  using (id = public.my_couple_id()) with check (id = public.my_couple_id());

-- word bank: readable by signed-in users, writable by admins.
create policy daily_words_select on public.daily_words for select to authenticated using (true);
create policy daily_words_insert on public.daily_words for insert to authenticated with check (public.is_admin());
create policy daily_words_update on public.daily_words for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy daily_words_delete on public.daily_words for delete to authenticated using (public.is_admin());

-- daily challenges: read-only for the couple. Writes go through the RPCs.
create policy daily_challenges_select on public.daily_challenges for select to authenticated
  using (couple_id = public.my_couple_id());

-- translations: the partner's answer stays hidden until I have answered (or the day is over).
create policy translations_select on public.translations for select to authenticated
  using (couple_id = public.my_couple_id() and public.can_see_translation(challenge_id, user_id));

-- partner challenges: the app reads them through get_partner_challenges(), which masks the
-- sender's answer. Direct reads are limited to rows where nothing is secret any more.
create policy partner_challenges_select on public.partner_challenges for select to authenticated
  using (couple_id = public.my_couple_id() and (sender_id = auth.uid() or status = 'answered'));

-- Our Words: shared inside the couple; each person edits / deletes their own entries.
create policy vocabulary_select on public.vocabulary for select to authenticated
  using (couple_id = public.my_couple_id());
create policy vocabulary_insert on public.vocabulary for insert to authenticated
  with check (couple_id = public.my_couple_id() and added_by = auth.uid());
create policy vocabulary_update on public.vocabulary for update to authenticated
  using (added_by = auth.uid() and couple_id = public.my_couple_id())
  with check (added_by = auth.uid() and couple_id = public.my_couple_id());
create policy vocabulary_delete on public.vocabulary for delete to authenticated
  using (added_by = auth.uid() and couple_id = public.my_couple_id());

create policy streaks_select on public.streaks for select to authenticated
  using (couple_id = public.my_couple_id());
create policy achievements_select on public.achievements for select to authenticated
  using (couple_id = public.my_couple_id());
create policy activity_select on public.activity for select to authenticated
  using (couple_id = public.my_couple_id());

create policy push_subscriptions_all on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================ GRANTS

grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Users can never touch couple_id, points or is_admin directly.
revoke insert, update, delete on public.profiles from authenticated;
grant update (name, username, avatar, native_language, target_language) on public.profiles to authenticated;
revoke insert, update, delete on public.couples from authenticated;
grant update (name, photo_url) on public.couples to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.my_couple_id(),
  public.is_admin(),
  public.couple_today(uuid),
  public.can_see_translation(uuid, uuid),
  public.create_couple(text, text),
  public.join_couple(text),
  public.get_today(),
  public.submit_translation(uuid, text),
  public.mark_translation(uuid, text),
  public.send_partner_challenge(text, text),
  public.answer_partner_challenge(uuid, text),
  public.mark_partner_challenge(uuid, text),
  public.get_partner_challenges(),
  public.get_couple_stats()
to authenticated;
grant execute on all functions in schema public to service_role;

-- ============================================================ STORAGE (avatars + couple photo)

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================ REALTIME

alter publication supabase_realtime add table public.activity;
