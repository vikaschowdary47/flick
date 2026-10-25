# eqlShare marketing site

The eqlShare pre-launch site is a static-first Next.js App Router project with a Supabase-backed waitlist.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Only the public anon key belongs in this app; never add a service-role key to a browser environment.

## Supabase setup

1. Create or open a Supabase project.
2. In SQL Editor, run [`supabase/waitlist.sql`](./supabase/waitlist.sql).
3. Copy the project URL and anon key into `.env.local` (and later into Vercel environment variables).
4. Confirm that the table has RLS enabled and that only the anonymous insert policy exists.

## Vercel deploy

Import the repository into Vercel, set the project root to `site`, and keep the framework preset as Next.js. Add the two `NEXT_PUBLIC_` environment variables for Production, Preview, and Development as needed. Vercel will build with `npm run build` automatically.

## DNS for eqlshare.com

At the domain registrar, add the records Vercel shows for the project. The usual setup is:

- `A` record for `@` → `76.76.21.21`
- `CNAME` record for `www` → `cname.vercel-dns.com`

Remove conflicting `A`/`CNAME` records, then add both `eqlshare.com` and `www.eqlshare.com` in Vercel and choose the canonical domain. DNS propagation can take a little while.

## Checks

```bash
npm run lint
npm run build
```
