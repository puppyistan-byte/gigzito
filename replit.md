# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/mobile` — GZMusic Module

Fully integrated music module. Base URL: `https://www.gigzito.com/api/gz-music`.

**Screens:**
- `app/(tabs)/gzmusic.tsx` — Main tab: GZ100 Chart (ranked by likes × ratings) + GZLibrary search toggle + mini audio player bar + Upload FAB
- `app/gzmusic/[id].tsx` — Track detail: full cover, play/pause, like toggle, 1–6 star rating, comments (post/delete), owner Announce panel (single email or mailing list)
- `app/gzmusic/upload.tsx` — Upload form: MP3 picker, cover art picker (square), license PDF, genre dropdown (50+ genres), download/library toggles, authenticity checkbox

**Hooks added to `hooks/useApi.ts`:**
`useGZ100`, `useGZLibrary`, `useGZTracksByUser`, `useGZTrackComments`, `useGZToggleLike`, `useGZRateTrack`, `useGZPostComment`, `useGZDeleteComment`, `useGZRecordPlay`, `useGZBatchLikes`, `useGZAnnounceSingle`, `useGZAnnounceMailing`, `useGZSubscriberCount`

**Audio:** `expo-audio@~1.1.1` (Expo 54's replacement for expo-av); `useAudioPlayer` hook with `player.replace()` for dynamic track switching.

**File upload:** `expo-document-picker@~14.0.8` for MP3 + PDF; `expo-image-picker` for cover art; multipart FormData to `/api/gz-music/submit`.

**Theme:** `#ff7a00` orange accent, `#000000` background, `#0b0b0b` cards, dark throughout.

**Navigation:** "GZMusic" entry added to hamburger drawer with orange accent; `gzmusic` registered in `app/(tabs)/_layout.tsx` and stack routes in `app/_layout.tsx`.

### `artifacts/mobile` — GZGroups Module

Full GZGroups feature. Entitlement-gated to `unlocks.hasGroups` from `/api/user/dashboard`.

**Screens:**
- `app/(tabs)/groups.tsx` — Groups tab: pending invites (accept/decline), My Groups list, Featured Groups discovery, upgrade prompt for users without `hasGroups`
- `app/groups/[id].tsx` — Group detail with 7 sub-tabs: Wall, Members, Kanban, Events, Endeavors, Retros, Wallets
- `app/groups/create.tsx` — Create group form (name, description, cover URL, private toggle)

**Sub-tab capabilities:**
- **Wall:** Post, delete (own or admin deletes any), live list
- **Members:** List with role badges, admin can remove members
- **Kanban:** Cards in todo/in_progress/done columns; tap to advance status; add/delete cards
- **Events:** Chronological list with date box; admin can delete
- **Endeavors:** Goal cards with progress counter; admin can bump progress
- **Retros:** Win + Roadblock form; historical retro cards
- **Wallets:** Expandable cards with live on-chain balance, contribution ledger (verified badge), log contribution form

**Private groups:** Non-members see a join-request screen with 50-char minimum message.

**Hooks added to `hooks/useApi.ts`:**
`useGroupInvites`, `useFeaturedGroups`, `useGroup`, `useGroupMembers`, `useGroupWall`, `useGroupWallComments`, `useGroupKanban`, `useGroupEvents`, `useGroupEndeavors`, `useGroupRetrospectives`, `useGroupWallets`, `useGroupWalletBalance`, `useGroupWalletContributions`, `useSearchGroupUsers`, `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup`, `useInviteToGroup`, `useInviteEmailToGroup`, `useRespondToGroupInvite`, `useJoinRequestGroup`, `useRemoveGroupMember`, `usePostToGroupWall`, `useDeleteGroupWallPost`, `useCommentOnWallPost`, `useCreateKanbanCard`, `useUpdateKanbanCard`, `useDeleteKanbanCard`, `useCreateGroupEvent`, `useDeleteGroupEvent`, `useCreateEndeavor`, `useUpdateEndeavor`, `useDeleteEndeavor`, `useSubmitRetrospective`, `useCreateGroupWallet`, `useDeleteGroupWallet`, `useLogContribution`

**Navigation:** "Groups" entry added to hamburger drawer with purple (`#9933FF`) accent; `groups` registered in `app/(tabs)/_layout.tsx`.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
