-- Allow staff PINs to repeat across different companies.
-- PIN hashes still remain unique within each company.

alter table public.nexus_staff_credentials
  drop constraint if exists nexus_staff_credentials_pin_lookup_key;

drop index if exists public.nexus_staff_credentials_pin_lookup_unique_idx;

create unique index if not exists nexus_staff_credentials_slug_pin_lookup_idx
  on public.nexus_staff_credentials (slug, pin_lookup);
