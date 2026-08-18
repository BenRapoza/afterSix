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
  share_code text unique,
  selected_option smallint not null default 0 check (selected_option between 0 and 2),
  is_finalized boolean not null default false,
  created_at timestamptz not null default now()
);

-- Safe to run on existing projects created before sharing was added.
alter table public.saved_nights add column if not exists share_code text unique;
alter table public.saved_nights add column if not exists selected_option smallint not null default 0 check (selected_option between 0 and 2);
alter table public.saved_nights add column if not exists is_finalized boolean not null default false;

create table if not exists public.night_votes (
  id uuid primary key default gen_random_uuid(),
  night_id uuid not null references public.saved_nights(id) on delete cascade,
  voter_key text not null,
  option_index smallint not null check (option_index between 0 and 2),
  created_at timestamptz not null default now(),
  unique (night_id, voter_key)
);

create index if not exists saved_nights_user_created_idx
  on public.saved_nights (clerk_user_id, created_at desc);
create index if not exists saved_nights_share_code_idx on public.saved_nights (share_code);
create index if not exists night_votes_night_idx on public.night_votes (night_id);

alter table public.user_profiles enable row level security;
alter table public.saved_nights enable row level security;
alter table public.night_votes enable row level security;

-- afterSix accesses these tables only through server routes authenticated by Clerk.
