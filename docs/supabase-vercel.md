# Supabase on Vercel

The dashboard app reads Supabase configuration at build time.

## Vercel environment variables

Add these variables in Vercel under Project Settings, Environment Variables:

- `SUPABASE_URL`: your Supabase project URL, for example `https://your-project-ref.supabase.co`
- `SUPABASE_ANON_KEY`: your public Supabase anon key

Add them for Production, Preview, and Development if all deployments should connect to Supabase.

Do not add a Supabase service role key to the Angular app. Browser code must only use the anon key.

## Vercel CLI

You can also add the variables with Vercel CLI:

```sh
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_URL preview
vercel env add SUPABASE_ANON_KEY preview
vercel env add SUPABASE_URL development
vercel env add SUPABASE_ANON_KEY development
```

## Local development

Create local environment values from the example file:

```sh
cp .env.example .env.local
```

Then update `.env.local` and run:

```sh
npm run env:supabase
```

The generated file is ignored by git:

```text
apps/dashboard/src/app/core/supabase/supabase.generated.ts
```

## Angular usage

Inject the configured client from dashboard code:

```ts
import { injectSupabase } from './core/supabase/supabase.client';

const supabase = injectSupabase();
```

The helper returns `null` when the environment variables are not set, which keeps local builds from failing before Supabase is configured.
