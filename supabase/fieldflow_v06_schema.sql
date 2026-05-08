-- FieldFlow v0.6 login/session schema patch
-- Safe to run after v0.5. Adds password JSON support while preserving pins.

create table if not exists public.company_configs (
  slug text primary key,
  company_name text not null,
  template text default 'landscaping',
  theme jsonb default '{"primary":"#1f6b3a","accent":"#d71920","background":"#f4f6f1","panel":"#ffffff"}'::jsonb,
  modules jsonb default '[]'::jsonb,
  labels jsonb default '{}'::jsonb,
  logo_url text,
  pins jsonb default '{"admin":"0000","manager":"1111","crew":"2222","media":"3333"}'::jsonb,
  passwords jsonb default '{"admin":"admin","manager":"manager","crew":"crew","media":"media"}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.company_configs add column if not exists company_name text;
alter table public.company_configs add column if not exists template text default 'landscaping';
alter table public.company_configs add column if not exists theme jsonb default '{"primary":"#1f6b3a","accent":"#d71920","background":"#f4f6f1","panel":"#ffffff"}'::jsonb;
alter table public.company_configs add column if not exists modules jsonb default '[]'::jsonb;
alter table public.company_configs add column if not exists labels jsonb default '{}'::jsonb;
alter table public.company_configs add column if not exists logo_url text;
alter table public.company_configs add column if not exists pins jsonb default '{"admin":"0000","manager":"1111","crew":"2222","media":"3333"}'::jsonb;
alter table public.company_configs add column if not exists passwords jsonb default '{"admin":"admin","manager":"manager","crew":"crew","media":"media"}'::jsonb;
alter table public.company_configs add column if not exists updated_at timestamptz default now();

insert into public.company_configs (slug, company_name, template, theme, modules, labels, pins, passwords, updated_at)
values (
  'joes',
  'Joe''s FieldOps',
  'landscaping',
  '{"primary":"#1f6b3a","accent":"#d71920","background":"#f4f6f1","panel":"#ffffff"}'::jsonb,
  '["Jobs","Crews","Equipment","Inventory","Issues","Media"]'::jsonb,
  '{"work":"Jobs","people":"Crews","assets":"Equipment"}'::jsonb,
  '{"admin":"0000","manager":"1111","crew":"2222","media":"3333"}'::jsonb,
  '{"admin":"admin","manager":"manager","crew":"crew","media":"media"}'::jsonb,
  now()
)
on conflict (slug) do update set
  company_name = excluded.company_name,
  template = excluded.template,
  theme = excluded.theme,
  modules = excluded.modules,
  labels = excluded.labels,
  pins = excluded.pins,
  passwords = excluded.passwords,
  updated_at = now();

create table if not exists public.fieldflow_uploads (
  id uuid primary key default gen_random_uuid(),
  company_slug text not null,
  area text default 'general',
  title text,
  file_url text not null,
  file_name text,
  mime_type text,
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('fieldflow-media', 'fieldflow-media', true)
on conflict (id) do update set public = true;

alter table public.company_configs enable row level security;
alter table public.fieldflow_uploads enable row level security;

drop policy if exists "Public read company configs" on public.company_configs;
create policy "Public read company configs" on public.company_configs for select using (true);

drop policy if exists "Public write company configs" on public.company_configs;
create policy "Public write company configs" on public.company_configs for all using (true) with check (true);

drop policy if exists "Public read uploads" on public.fieldflow_uploads;
create policy "Public read uploads" on public.fieldflow_uploads for select using (true);

drop policy if exists "Public write uploads" on public.fieldflow_uploads;
create policy "Public write uploads" on public.fieldflow_uploads for all using (true) with check (true);

drop policy if exists "Public read fieldflow media" on storage.objects;
create policy "Public read fieldflow media" on storage.objects for select using (bucket_id = 'fieldflow-media');

drop policy if exists "Public upload fieldflow media" on storage.objects;
create policy "Public upload fieldflow media" on storage.objects for insert with check (bucket_id = 'fieldflow-media');

drop policy if exists "Public update fieldflow media" on storage.objects;
create policy "Public update fieldflow media" on storage.objects for update using (bucket_id = 'fieldflow-media') with check (bucket_id = 'fieldflow-media');
