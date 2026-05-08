# FieldFlow v0.6 Login + Device Session Add-on

Merge patch. Do not delete your project first.

## What this adds

- PIN auto-unlock after 4 digits
- Optional password login mode
- Keep-this-device-logged-in session using localStorage
- Company slug front doors like `/joes`
- Company deep links like `/joes/dashboard`, `/joes/crew`, `/joes/admin`
- Base `/` remembers the last company and saved role on that device
- Admin role/password fields in the Roles step
- Includes the missing `lib/v2Data.ts` and `lib/v2Additions.ts` support files

## Demo logins

For Joe's FieldOps:

- Admin: PIN `0000`, password `admin`
- Manager: PIN `1111`, password `manager`
- Crew: PIN `2222`, password `crew`
- Media: PIN `3333`, password `media`

## SQL

Open `supabase/fieldflow_v06_schema.sql`, copy all of it, paste into Supabase SQL Editor, and click Run.

## Important

This is still a field-app style device login, not bank-grade auth. For true paid customer auth later, add Supabase Auth users or magic links. This version is meant to make demos and real crew-device workflows feel good now.
