-- sql/hardening.sql — idempotent. Run in Supabase → SQL Editor (safe to re-run).
-- The repo had no sql/ folder, so this file creates what is missing and tightens
-- what exists. It only touches the tables listed below.
--
--   profiles · user_state · chat_sessions · chat_messages · user_profiles
--
-- BEFORE running: take a look at what policies already exist (section 9 query).
-- Permissive policies are OR-ed together: one old "using (true)" policy would
-- cancel every rule below. Drop any that are not yours.

-- ───────────────────────────────────────────────────────────── 1. profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  date_of_birth date,
  gender        text,
  nihongo_level text,
  learning_goal text,
  updated_at    timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists nihongo_level text;
alter table public.profiles add column if not exists learning_goal text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- No insert/delete policy on purpose: rows are created by the trigger below and
-- removed by the ON DELETE CASCADE when the auth user is deleted.

-- Column-level lock: the browser may not rewrite id or email.
revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, date_of_birth, gender, nihongo_level, learning_goal, updated_at)
  on public.profiles to authenticated;

do $$ begin
  alter table public.profiles drop constraint if exists profiles_gender_chk;
  alter table public.profiles add constraint profiles_gender_chk
    check (gender is null or gender in ('male','female','non_binary','prefer_not_to_say')) not valid;
  alter table public.profiles drop constraint if exists profiles_level_chk;
  alter table public.profiles add constraint profiles_level_chk
    check (nihongo_level is null or nihongo_level in ('absolute_beginner','n5','n4','n3','n2','n1')) not valid;
  alter table public.profiles drop constraint if exists profiles_len_chk;
  alter table public.profiles add constraint profiles_len_chk
    check (char_length(coalesce(display_name,'')) <= 40 and char_length(coalesce(learning_goal,'')) <= 240) not valid;
end $$;

-- Trigger: build the profile server-side from an allow-list of metadata keys.
-- Works even when e-mail confirmation is on (the browser has no session yet, so the
-- old client-side upsert silently failed under RLS).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_dob date;
begin
  begin
    if (m->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$' then
      v_dob := (m->>'date_of_birth')::date;
      if v_dob < date '1900-01-01' or v_dob > current_date then v_dob := null; end if;
    end if;
  exception when others then v_dob := null;
  end;

  insert into public.profiles (id, email, display_name, date_of_birth, gender, nihongo_level, learning_goal)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(m->>'display_name',''), nullif(m->>'full_name',''), nullif(m->>'name',''), split_part(new.email,'@',1)), 40),
    v_dob,
    case when m->>'gender' in ('male','female','non_binary','prefer_not_to_say') then m->>'gender' else 'prefer_not_to_say' end,
    case when m->>'nihongo_level' in ('absolute_beginner','n5','n4','n3','n2','n1') then m->>'nihongo_level' else 'absolute_beginner' end,
    left(coalesce(m->>'learning_goal',''), 240)
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;   -- never block sign-up because of a profile problem
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────── 2. user_state (cloud sync)
create table if not exists public.user_state (
  user_id           uuid not null references auth.users(id) on delete cascade,
  key               text not null,
  value             jsonb,
  client_updated_at bigint,
  updated_at        timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_state add column if not exists updated_at timestamptz not null default now();
alter table public.user_state enable row level security;
alter table public.user_state force row level security;

drop policy if exists "user_state_all_own" on public.user_state;
create policy "user_state_all_own" on public.user_state
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;

do $$ begin
  alter table public.user_state drop constraint if exists user_state_key_chk;
  alter table public.user_state add constraint user_state_key_chk
    check (key in (
      'nihongo_progress','nihongo_bookmarks','nihongo_srs_cards','nihongo_srs_log','nihongo_srs_prefs',
      'nihongo_srs_meta','nihongo_speak_log','nihongo_speak_meta','nihongo_quiz_prefs','nihongo_quiz_history',
      'nihongo_quiz_last_lesson','nihongo_kanji_prefs','nihongo_kanji_quiz_history','nihongo_placement_result'
    )) not valid;
  alter table public.user_state drop constraint if exists user_state_size_chk;
  alter table public.user_state add constraint user_state_size_chk
    check (octet_length(value::text) <= 400000) not valid;   -- ~400 KB per key
end $$;

-- ───────────────────────────────────────────────────────── 3. tutor tables
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  jlpt_level  text not null default 'N5',
  mode        text not null default 'chat',
  lesson      int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.chat_sessions add column if not exists mode text not null default 'chat';
alter table public.chat_sessions add column if not exists lesson int;

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  role        text not null,
  content     text not null,
  correction  jsonb,
  suggestion  jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  jlpt_level  text not null default 'N5'
);

do $$ begin
  alter table public.chat_sessions drop constraint if exists chat_sessions_level_chk;
  alter table public.chat_sessions add constraint chat_sessions_level_chk check (jlpt_level in ('N5','N4','N3')) not valid;
  alter table public.chat_sessions drop constraint if exists chat_sessions_mode_chk;
  alter table public.chat_sessions add constraint chat_sessions_mode_chk check (mode in ('chat','roleplay','correct','explain')) not valid;
  alter table public.chat_messages drop constraint if exists chat_messages_role_chk;
  alter table public.chat_messages add constraint chat_messages_role_chk check (role in ('user','assistant')) not valid;
  alter table public.chat_messages drop constraint if exists chat_messages_len_chk;
  alter table public.chat_messages add constraint chat_messages_len_chk check (char_length(content) <= 4000) not valid;
  alter table public.user_profiles drop constraint if exists user_profiles_level_chk;
  alter table public.user_profiles add constraint user_profiles_level_chk check (jlpt_level in ('N5','N4','N3')) not valid;
end $$;

create index if not exists chat_sessions_user_updated_idx on public.chat_sessions (user_id, updated_at desc);
create index if not exists chat_messages_session_created_idx on public.chat_messages (session_id, created_at);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_profiles enable row level security;
alter table public.chat_sessions force row level security;
alter table public.chat_messages force row level security;
alter table public.user_profiles force row level security;

drop policy if exists "chat_sessions_own" on public.chat_sessions;
create policy "chat_sessions_own" on public.chat_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "chat_messages_own" on public.chat_messages;
create policy "chat_messages_own" on public.chat_messages
  for all to authenticated
  using (exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

drop policy if exists "user_profiles_own" on public.user_profiles;
create policy "user_profiles_own" on public.user_profiles
  for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.chat_sessions, public.chat_messages, public.user_profiles from anon;
grant select, insert, update, delete on public.chat_sessions, public.chat_messages, public.user_profiles to authenticated;

-- ───────────────────────────────────────────────────────── 9. verify (run these by hand)
-- a) Every table must show rowsecurity = true:
--    select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
-- b) Review ALL policies; delete any permissive leftovers you did not write:
--    select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public' order by 1,2;
-- c) After the constraints look right for your existing rows:
--    alter table public.profiles validate constraint profiles_gender_chk;   (repeat for the others)
-- d) Anon must see nothing:
--    set role anon; select count(*) from public.profiles;   -- expect permission denied
--    reset role;
