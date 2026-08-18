create table if not exists public.user_profiles (
  clerk_user_id text primary key,
  name text,
  home_base text not null default 'Boston, MA',
  dietary_preferences text not null default 'No restrictions',
  transportation text not null default 'Rideshare',
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_nights (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text not null,
  itinerary jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_nights_user_created_idx
  on public.saved_nights (clerk_user_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.saved_nights enable row level security;

-- afterSix accesses these tables only through server routes authenticated by Clerk.
