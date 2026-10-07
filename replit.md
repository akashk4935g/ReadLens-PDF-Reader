# ReadLens

A local-first PDF reader for reading, searching, highlighting, and saving notes without uploading documents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/readlens run typecheck` — typecheck the ReadLens app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- ReadLens does not require a database or secrets for its local-first reading features.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite + TypeScript, Tailwind CSS, Wouter
- PDF: react-pdf / PDF.js
- Local persistence: browser IndexedDB
- Shared API: Express 5; PostgreSQL + Drizzle are available to future server-backed features

## Where things live

- `artifacts/readlens/src/pages/` — home, upload, PDF reader, notes, search, and settings
- `artifacts/readlens/src/lib/library.ts` — IndexedDB persistence and document/annotation types
- `artifacts/readlens/src/index.css` — visual theme and PDF reader styling
- `artifacts/api-server/` and `lib/api-spec/` — shared server and API contract, not used for local ReadLens storage

## Architecture decisions

- The first release stores PDFs, extracted page text, notes, and reading position in browser IndexedDB; it has no accounts or cloud sync.
- PDF text indexing and keyword search run in the browser. The original PDF is not modified.
- AI actions remain unavailable unless a provider is configured; reading and annotations do not depend on AI.

## Product

- Import PDFs, resume reading, navigate and zoom pages, select and copy text, save categorized highlights/comments, search across the local library, and open notes at their source page.

## User preferences

No additional standing preferences recorded.

## Gotchas

- Browser/site-data clearing can erase the local library; there is no cross-device backup or sync in this release.
- AI help is not active in the current build.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
