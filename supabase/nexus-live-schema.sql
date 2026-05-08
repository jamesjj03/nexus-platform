-- Nexus live schema patch. Safe to run multiple times in Supabase SQL Editor.

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

alter table public.company_configs add column if not exists company_name text;
alter table public.company_configs add column if not exists template text default 'general';
alter table public.company_configs add column if not exists theme jsonb default '{"primary":"#14E0C9","accent":"#FF4FA3","background":"#F6F8FB","panel":"#ffffff"}'::jsonb;
alter table public.company_configs add column if not exists modules jsonb default '[]'::jsonb;
alter table public.company_configs add column if not exists labels jsonb default '{}'::jsonb;
alter table public.company_configs add column if not exists logo_url text;
alter table public.company_configs add column if not exists pins jsonb default '{}'::jsonb;
alter table public.company_configs add column if not exists passwords jsonb default '{}'::jsonb;
alter table public.company_configs add column if not exists updated_at timestamptz default now();

create table if not exists public.nexus_company_data (
  slug text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.company_configs (slug, company_name, template, theme, modules, labels, pins, passwords, updated_at)
values
('joes','Joe''s FieldOps','landscaping','{"primary":"#14E0C9","accent":"#FF4FA3","background":"#F6F8FB","panel":"#ffffff"}'::jsonb,'["Jobs","Crews","Equipment","Tools","Inventory","Issues","Media","Quotes","Staff"]'::jsonb,'{"work":"Jobs","people":"Crews","assets":"Equipment"}'::jsonb,'{"admin":"5000","manager":"5001","crew":"5002","media":"5003","__access":{"pinStart":"5000","pinEnd":"5099","companyAdminPin":"5000","managerPin":"5001","crewPin":"5002","mediaPin":"5003"},"__passwords":{"admin":"joeadmin","manager":"joemanager","crew":"joecrew","media":"joemedia"}}'::jsonb,'{"admin":"joeadmin","manager":"joemanager","crew":"joecrew","media":"joemedia"}'::jsonb,now()),
('gff','GFF Fiber Sales','d2d','{"primary":"#14E0C9","accent":"#FF4FA3","background":"#F6F8FB","panel":"#ffffff"}'::jsonb,'["Leads","Reps","Territories","Installs","Follow-Ups","Media","Reports","Staff"]'::jsonb,'{"work":"Leads","people":"Reps","assets":"Sales Kits"}'::jsonb,'{"admin":"6000","manager":"6001","crew":"6002","media":"6003","__access":{"pinStart":"6000","pinEnd":"6099","companyAdminPin":"6000","managerPin":"6001","crewPin":"6002","mediaPin":"6003"},"__passwords":{"admin":"gffadmin","manager":"gffmanager","crew":"gffcrew","media":"gffmedia"}}'::jsonb,'{"admin":"gffadmin","manager":"gffmanager","crew":"gffcrew","media":"gffmedia"}'::jsonb,now())
on conflict (slug) do update set
  company_name = excluded.company_name,
  template = excluded.template,
  theme = excluded.theme,
  modules = excluded.modules,
  labels = excluded.labels,
  pins = excluded.pins,
  passwords = excluded.passwords,
  updated_at = now();

alter table public.company_configs enable row level security;
alter table public.nexus_company_data enable row level security;

drop policy if exists "nexus_company_configs_read" on public.company_configs;
drop policy if exists "nexus_company_configs_write" on public.company_configs;
drop policy if exists "nexus_company_data_read" on public.nexus_company_data;
drop policy if exists "nexus_company_data_write" on public.nexus_company_data;

create policy "nexus_company_configs_read" on public.company_configs for select to anon, authenticated using (true);
create policy "nexus_company_configs_write" on public.company_configs for all to anon, authenticated using (true) with check (true);
create policy "nexus_company_data_read" on public.nexus_company_data for select to anon, authenticated using (true);
create policy "nexus_company_data_write" on public.nexus_company_data for all to anon, authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('fieldflow-media', 'fieldflow-media', true)
on conflict (id) do update set public = true;
