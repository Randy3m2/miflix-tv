-- MiFlix V1.9.1 cloud sync
-- Run once in Supabase > SQL Editor for the project you want MiFlix to use.

create table if not exists public.miflix_user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

alter table public.miflix_user_state enable row level security;

-- Safe to re-run this file.
drop policy if exists "miflix_select_own" on public.miflix_user_state;
drop policy if exists "miflix_insert_own" on public.miflix_user_state;
drop policy if exists "miflix_update_own" on public.miflix_user_state;
drop policy if exists "miflix_delete_own" on public.miflix_user_state;

create policy "miflix_select_own"
  on public.miflix_user_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "miflix_insert_own"
  on public.miflix_user_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "miflix_update_own"
  on public.miflix_user_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "miflix_delete_own"
  on public.miflix_user_state for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.miflix_user_state to authenticated;
