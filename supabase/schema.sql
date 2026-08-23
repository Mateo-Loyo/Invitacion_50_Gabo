create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  display_name text not null,
  guest_limit smallint not null check (guest_limit between 1 and 5),
  whatsapp_phone text,
  active boolean not null default true,
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  invite_id uuid primary key references public.invitations(id) on delete cascade,
  attending boolean not null,
  confirmed_guests smallint not null check (confirmed_guests between 0 and 5),
  updated_at timestamptz not null default now()
);

create index if not exists invitations_active_created_at_idx
  on public.invitations (active, created_at);

alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;

revoke all on table public.invitations from anon, authenticated;
revoke all on table public.rsvps from anon, authenticated;
grant all on table public.invitations to service_role;
grant all on table public.rsvps to service_role;

-- No public table policies are created.
-- The web application accesses these tables only from server routes
-- using SUPABASE_SECRET_KEY, which must NEVER be exposed in the browser.
