-- Lean Kitchen Tracker — Supabase schema
-- Run in the Supabase SQL editor. Requires the auth schema (default).

create extension if not exists "pgcrypto";

-- ---------- food_logs ----------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  meal text not null,
  name text not null,
  kcal numeric not null default 0,
  p numeric not null default 0,
  c numeric not null default 0,
  f numeric not null default 0,
  qty numeric not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date on public.food_logs(user_id, date);

-- ---------- my_foods (recents) ----------
create table if not exists public.my_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  basis text not null default 'serving',  -- 'serving' | '100g'
  kcal numeric not null default 0,
  p numeric not null default 0,
  c numeric not null default 0,
  f numeric not null default 0,
  use_count int not null default 1,
  last_used timestamptz not null default now()
);
create index if not exists my_foods_user on public.my_foods(user_id);

-- ---------- weights ----------
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  weight_kg numeric not null,
  unique (user_id, date)
);

-- ---------- day_meta (training / rest) ----------
create table if not exists public.day_meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  day_type text not null default 'training',
  unique (user_id, date)
);

-- ---------- settings ----------
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  training_kcal numeric not null default 2100,
  training_p numeric not null default 185,
  training_c numeric not null default 205,
  training_f numeric not null default 60,
  rest_kcal numeric not null default 1950,
  rest_p numeric not null default 185,
  rest_c numeric not null default 165,
  rest_f numeric not null default 58
);

-- ---------- Row Level Security ----------
alter table public.food_logs enable row level security;
alter table public.my_foods enable row level security;
alter table public.weights enable row level security;
alter table public.day_meta enable row level security;
alter table public.settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['food_logs','my_foods','weights','day_meta','settings'] loop
    execute format('drop policy if exists "owner_all" on public.%I;', t);
    execute format(
      'create policy "owner_all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t);
  end loop;
end $$;
