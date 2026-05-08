# FieldFlow v0.5 Full UI Upgrade Add-on

Merge patch. Do not delete your project first.

## What this does

- Replaces the raw-looking home page with a real iPhone-style PIN keypad.
- Keeps company selection only on the login screen/admin side.
- Keeps manager locked into the active company config.
- Applies a full visual reskin across dashboard, jobs, equipment, inventory, issues, staff, crew, media, and admin.
- Keeps the existing ManagerApp / StudioAdmin / CrewPortal architecture.
- Fixes the Map constructor bug by using `globalThis.Map`.
- Uses Tailwind v4-friendly `@import "tailwindcss";` at the top of globals.css.

## Install

Copy these folders/files into your project and replace the matching files:

- app/
- components/
- lib/
- supabase/
- package.json only if you want exact dependency matching

Then run:

```bash
npm run dev
```

## Supabase SQL

Run this in Supabase SQL Editor:

```txt
supabase/fieldflow_v05_schema.sql
```

The SQL is safe to rerun. It adds missing columns like `pins` if an older schema exists.

## Demo PINs

- 0000 = Admin Studio
- 1111 = Manager Board
- 2222 = Crew Portal
- 3333 = Media Library
