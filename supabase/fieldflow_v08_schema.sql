-- FieldFlow v0.8 optional persistence layer.
-- Safe additive tables for future live staff permissions and request syncing.

create table if not exists public.fieldflow_staff (
  id text primary key,
  company_slug text not null,
  name text not null,
  role text not null default 'Crew Member',
  crew text default '',
  status text default 'Active',
  available text default 'Now',
  permissions jsonb not null default '[]'::jsonb,
  temp_pin text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fieldflow_requests (
  id text primary key,
  company_slug text not null,
  kind text not null,
  item text not null,
  requested_by text default '',
  crew text default '',
  status text not null default 'Pending',
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fieldflow_staff_company_slug_idx on public.fieldflow_staff(company_slug);
create index if not exists fieldflow_requests_company_slug_idx on public.fieldflow_requests(company_slug);
create index if not exists fieldflow_requests_status_idx on public.fieldflow_requests(status);
