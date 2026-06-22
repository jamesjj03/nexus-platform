-- Nexus live schema. Safe to rerun.
-- Browser clients should not write these tables directly.

create table if not exists public.company_configs (
  slug text primary key,
  company_name text not null,
  template text default 'general',
  theme jsonb default '{"primary":"#14E0C9","accent":"#FF4FA3","background":"#F6F8FB","panel":"#ffffff"}'::jsonb,
  modules jsonb default '[]'::jsonb,
  labels jsonb default '{}'::jsonb,
  logo_url text,
  pins jsonb default '{}'::jsonb,
  passwords jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.nexus_company_data (
  slug text primary key references public.company_configs(slug) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.nexus_staff_credentials (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.company_configs(slug) on delete cascade,
  person_id text not null,
  person_name text not null,
  role text not null check (role in ('admin','manager','crew')),
  access_level text,
  permissions jsonb not null default '[]'::jsonb,
  pin_lookup text not null,
  password_hash text not null,
  must_change_password boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (slug, person_id),
  unique (pin_lookup)
);

create table if not exists public.nexus_sessions (
  token_hash text primary key,
  slug text not null,
  role text not null check (role in ('owner','admin','manager','crew')),
  person_id text,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists nexus_staff_credentials_slug_idx on public.nexus_staff_credentials(slug);
create index if not exists nexus_staff_credentials_pin_lookup_idx on public.nexus_staff_credentials(pin_lookup);
create index if not exists nexus_sessions_expires_at_idx on public.nexus_sessions(expires_at);

alter table public.company_configs enable row level security;
alter table public.nexus_company_data enable row level security;
alter table public.nexus_staff_credentials enable row level security;
alter table public.nexus_sessions enable row level security;

drop policy if exists "nexus_company_configs_read" on public.company_configs;
drop policy if exists "nexus_company_configs_write" on public.company_configs;
drop policy if exists "nexus_company_data_read" on public.nexus_company_data;
drop policy if exists "nexus_company_data_write" on public.nexus_company_data;
drop policy if exists "nexus_staff_credentials_read" on public.nexus_staff_credentials;
drop policy if exists "nexus_staff_credentials_write" on public.nexus_staff_credentials;
drop policy if exists "nexus_sessions_read" on public.nexus_sessions;
drop policy if exists "nexus_sessions_write" on public.nexus_sessions;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public)
      values ('fieldflow-media', 'fieldflow-media', true)
      on conflict (id) do update set public = true
    $sql$;
  end if;
end $$;
