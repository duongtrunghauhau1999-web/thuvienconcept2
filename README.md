# THUVIENCONCEPT — Concept Library (starter)

A starter web app for browsing photography concepts, selecting images, and exporting a contact sheet for Zalo.

## Current starter features
- Seven categories: Bầu, Beauty, Baby, Kid, Cưới, Newborn, Gia đình
- Demo placeholder gallery (no real images needed yet)
- Multi-select and a selected-concepts view
- Export a JPG contact sheet with customer name
- Supabase client configuration via environment variables
- Admin sign-in screen scaffold

## Run locally
1. Install Node.js LTS from https://nodejs.org/
2. In this folder run:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local`.
4. Fill in the Supabase Project URL and publishable/anon key from Supabase Project Settings → API.
5. Run:
   ```bash
   npm run dev
   ```

## Important security notes
- Never put the database password or Supabase `service_role` / secret key in frontend code.
- Admin access must be secured with Supabase Auth and Row Level Security policies.
- This starter's admin screen is only a scaffold. Do not treat it as production-ready until the admin UID is added to `public.app_admins` and all access policies/storage settings are tested.
- Demo cards use remote Unsplash images and are not actual client concepts. Replace them only after the interface is approved.
- Supabase Storage bucket currently assumed to be `concept-images`.

## Deploy later
Push the source to GitHub, then connect the repository to Cloudflare Pages with build command `npm run build`, output directory `dist`, and environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
