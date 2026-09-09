-- Banning Procurement Hub — initial schema.
-- Quotes (public form submissions) + security_events (auth/audit trail).
-- RLS is enabled on both tables with zero policies for the anon/authenticated
-- roles: all reads are server-side via the service-role client, which
-- bypasses RLS. Insert/select/update from the API happen through the service
-- role key, never through the anon key.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null,
  phone text not null,
  email text,
  area text not null,
  note text,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'won', 'lost')),
  created_at timestamptz not null default now()
);

create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
create index if not exists quotes_status_idx on public.quotes (status);

alter table public.quotes enable row level security;

-- ---------------------------------------------------------------------------
-- security_events
-- ---------------------------------------------------------------------------
create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx
  on public.security_events (created_at desc);

alter table public.security_events enable row level security;