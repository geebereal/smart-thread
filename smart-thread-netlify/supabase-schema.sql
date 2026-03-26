-- ═══════════════════════════════════════════════════════════
-- Smart Thread — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. USER ACCOUNTS (extends Supabase auth.users)
create table public.user_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'seed' check (plan in ('seed','grow','scale','dominate','forever')),
  role text not null default 'user' check (role in ('user','beta','admin')),
  gifted_plan text, -- admin can gift a plan without a license key
  license_key text,
  license_status text not null default 'none' check (license_status in ('none','valid','invalid')),
  license_expiry timestamptz, -- null = permanent / lifetime
  theme text not null default 'dark' check (theme in ('dark','light')),
  gens_used integer not null default 0,
  rw_used integer not null default 0,
  rw_date text, -- tracks daily rewrite reset
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. PROFILES
create table public.profiles (
  id bigint primary key generated always as identity,
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  name text,
  handle text,
  niche text,
  audience text,
  voice text,
  avoid text,
  example text,
  icon text default 'bolt',
  created_at timestamptz not null default now()
);

-- 3. THREAD HISTORY
create table public.thread_history (
  id bigint primary key generated always as identity,
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  topic text,
  hook_id text,
  thread_len text,
  cta_type text,
  tweets jsonb not null default '[]'::jsonb,
  profile_id bigint references public.profiles(id) on delete set null,
  profile_name text,
  status text not null default 'drafted' check (status in ('drafted','posted','viral','flopped')),
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — users can only access their own data
-- ═══════════════════════════════════════════════════════════

alter table public.user_accounts enable row level security;
alter table public.profiles enable row level security;
alter table public.thread_history enable row level security;

-- user_accounts: users can read/update only their own row
create policy "Users can view own account"
  on public.user_accounts for select
  using (auth.uid() = id);

create policy "Users can update own account"
  on public.user_accounts for update
  using (auth.uid() = id);

create policy "Users can insert own account"
  on public.user_accounts for insert
  with check (auth.uid() = id);

-- profiles: users can CRUD only their own profiles
create policy "Users can view own profiles"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profiles"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profiles"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profiles"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- thread_history: users can CRUD only their own history
create policy "Users can view own history"
  on public.thread_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.thread_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own history"
  on public.thread_history for update
  using (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.thread_history for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- AUTO-CREATE user_accounts ROW ON SIGNUP
-- ═══════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_accounts (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at
-- ═══════════════════════════════════════════════════════════

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_accounts_updated_at
  before update on public.user_accounts
  for each row execute function public.update_updated_at();
