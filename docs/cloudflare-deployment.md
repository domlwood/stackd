# Cloudflare Workers deployment

Stackd is a server-rendered Next.js app with authentication and server actions.
Deploy it as a **Worker with OpenNext**, using `apps/web/wrangler.jsonc`.
The Worker name is `stackd`. It is not a static SPA or a Cloudflare Pages export.

## Connected Git repository

Configure the Worker in Cloudflare Workers & Pages → stackd → Settings → Build:

| Setting                     | Value                                 |
| --------------------------- | ------------------------------------- |
| Root directory              | Repository root (`/`), not `apps/web` |
| Build command               | `npm run cf:build`                    |
| Deploy command              | `npm run cf:deploy`                   |
| Node version build variable | `NODE_VERSION=22.22.2`                |

Install dependencies from the repository root so npm workspaces, the shared UI
and the lockfile are available. Keep install scripts enabled: the root
`postinstall` applies the next-themes compatibility patch.

Add these **Build variables and secrets**:

| Name                            | Type | Value                                     |
| ------------------------------- | ---- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Text | Same project URL as local `apps/web/.env` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Text | Same public anon key as local development |
| `NODE_VERSION`                  | Text | `22.22.2`                                 |

Next.js embeds the two `NEXT_PUBLIC_*` values into the browser bundle. These are
public identifiers; Supabase RLS and user authentication protect the data.
Rebuild after changing either public value.

Separately, under **Settings → Variables and Secrets**, add the two Supabase
variables again as runtime Text variables. The Rightmove switch is declared in
Wrangler as `INGEST_RIGHTMOVE_ENABLED=true`; set it to false in the configuration
to disable ingestion. `keep_vars`/`--keep-vars` retain dashboard runtime variables.

There are currently **no application runtime secrets required**. Do not upload:

- `SUPABASE_SERVICE_ROLE_KEY`: local admin/seed scripts only; bypasses RLS.
- `SEED_USER_*`, including passwords: local account setup only.
- `SEED_WORKSPACE_NAME`: local seed setup only.

Cloudflare's connected Git deployment manages its deployment authentication.
You don't need to add a Cloudflare API token to the app's runtime variables.

## Supabase

Continue using the existing hosted project, schema, users and private
`listing-snapshots` bucket. Do not run the seed as part of deployment.

After Cloudflare supplies the production URL, set it as the Supabase Auth Site
URL and add it to the allowed redirect URLs. Use the final custom domain if one
is configured. Keep public sign-ups disabled. Email/password sign-in uses the
existing users.

## Local verification and deployment

From the repository root:

```sh
npm ci
npm run cf:build
```

The build invokes Next's Webpack production build, then packages the result as a
Worker. It strips copied local env files and embedded env defaults from the
OpenNext output, so admin credentials cannot travel with local deployment
artifacts. Runtime configuration must come from Worker bindings.

To preview locally, copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`,
fill in the two public Supabase values, then run `npm run cf:preview`.

`npm run cf:deploy` publishes the already built Worker; the Cloudflare Git build
must run the build command first. For a terminal deployment, authenticate with
Wrangler first. The scripts do not create or seed Supabase resources.

## Configuration choices and verification

Authenticated pages render per request and queries use the signed-in Supabase
client. There is no ISR/data cache to persist, so this setup does not require an
R2 bucket or D1 database. Listing snapshots remain in Supabase Storage. The
Worker has Node.js compatibility for Next.js and snapshot gzip handling.

Next.js 16 `proxy.ts` uses OpenNext's experimental Node middleware support.
Verify signed-out redirects, sign-in/session refresh, deal edits, and listing
capture in the deployed Workers runtime before relying on the deployment.

Sources: [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/),
[OpenNext setup](https://opennext.js.org/cloudflare/get-started),
[build/runtime variables](https://opennext.js.org/cloudflare/howtos/env-vars),
[OpenNext feature support](https://opennext.js.org/cloudflare).
