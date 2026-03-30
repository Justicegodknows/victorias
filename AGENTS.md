<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AGENTS.md — victorias

> **Ground truth for every AI agent working in this repository.**
> CLAUDE.md delegates here (`@AGENTS.md`). Do not split instructions across both files.

---

## ⚠️ Critical: Version Reality Check

**This is NOT the Next.js, React, or Tailwind you were trained on.**

| Package | Version in this repo | What changed |
|---|---|---|
| `next` | **16.2.1** | Post-training. APIs, routing conventions, and config may differ from Next.js 13–15. |
| `react` / `react-dom` | **19.2.4** | New compiler, changed hooks behaviour, updated concurrent features. |
| `ai` (Vercel AI SDK) | **6.0.141** | Breaking changes from v4/v5. Import paths, hook signatures, and stream APIs differ. |
| `tailwindcss` | **v4** | No `tailwind.config.js`. Configuration lives in CSS via `@import "tailwindcss"` and `@theme`. |
| `eslint` | **9** | Flat config only (`eslint.config.mjs`). No `.eslintrc` files. |

**Before writing any code involving these packages:**
1. Read `node_modules/next/dist/docs/` for Next.js 16 specifics.
2. Read `node_modules/ai/` README or changelog for SDK v6 import paths and hook signatures.
3. Confirm Tailwind v4 utility names — some v3 utilities have been renamed or removed.

Never rely on training-data assumptions for these packages. When in doubt, check `node_modules`.

---

## Project Purpose

`victorias` is a Next.js web application using the Vercel AI SDK to power AI-driven UI features. The `app/` directory uses the **App Router** exclusively.

> **TODO for team:** Replace this paragraph with one or two sentences describing the product when the purpose is finalised.

---

## Repository Structure

```
victorias/
├── app/                  # Next.js App Router — all routes, layouts, and pages live here
│   └── ...
├── public/               # Static assets served at /
├── .gitignore
├── AGENTS.md             # ← You are here
├── CLAUDE.md             # Delegates to AGENTS.md via @AGENTS.md
├── eslint.config.mjs     # ESLint 9 flat config
├── next.config.ts        # Next.js config (TypeScript)
├── package.json
├── package-lock.json     # Locked dependency tree — do not modify manually
├── postcss.config.mjs    # PostCSS config for Tailwind v4
├── tsconfig.json         # TypeScript compiler options
└── README.md
```

**Rules:**
- All application code lives inside `app/`. Do not create a `src/` or `pages/` directory.
- Static files belong in `public/`. Do not serve assets from `app/`.
- Do not add a `tailwind.config.js` — Tailwind v4 is configured in CSS only.
- Do not add a `.eslintrc`, `.eslintrc.json`, or `.eslintrc.js` — ESLint 9 uses flat config exclusively.

---

## Commands

These are the only commands the agent should run. Use exactly as written.

```bash
# Start development server (hot reload on http://localhost:3000)
npm run dev

# Type-check and compile for production
npm run build

# Serve the production build (run after build)
npm run start

# Run linter across all files
npm run lint

# Install a new dependency
npm install <package>

# Install a new dev dependency
npm install --save-dev <package>
```

**No test runner is configured yet.** Do not invent or assume a test command. When tests are added, update this file with the exact command.

---

## TypeScript

- **Strict mode is expected.** Do not introduce code that requires loosening `tsconfig.json`.
- All new files must use `.ts` or `.tsx` extensions — no `.js` or `.jsx` in `app/`.
- Config files (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`) keep their existing extensions — do not convert them.
- Use explicit return types on exported functions and React components.
- Prefer `type` over `interface` for object shapes unless you need declaration merging.
- Use `unknown` instead of `any`. If `any` is unavoidable, add an inline comment explaining why.
- Never use `// @ts-ignore`. Use `// @ts-expect-error` with a comment when suppression is truly necessary.

```ts
// ✅ correct
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function MyComponent(): React.ReactElement { ... }

// ❌ wrong
export function MyComponent() { ... }          // missing return type
const data: any = await fetch(...);            // use unknown
```

---

## App Router Conventions (Next.js 16)

- Use the **App Router only**. Do not create anything under `pages/`.
- Every route segment is a folder inside `app/`. Special files are: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts` (API routes).
- **Server Components are the default.** Add `'use client'` only at the lowest component that actually needs it (event handlers, hooks, browser APIs).
- **Never add `'use client'` to a layout file** unless you have verified it is necessary — it opts the entire subtree out of server rendering.
- Data fetching happens in Server Components via `async/await` directly — do not use `useEffect` for data fetching in Server Components.
- API routes live at `app/api/<name>/route.ts` and export named HTTP-method handlers (`GET`, `POST`, etc.).

```ts
// app/api/chat/route.ts — correct API route shape
export async function POST(req: Request): Promise<Response> { ... }

// ❌ wrong — pages-router style
export default function handler(req, res) { ... }
```

---

## Vercel AI SDK v6 (`ai`)

**SDK v6 has breaking changes from v4 and v5. Do not assume import paths or hook signatures from older versions.**

- Before calling any SDK function, verify the current export from `node_modules/ai/`.
- Stream responses from API routes using the SDK's streaming utilities — do not manually construct `ReadableStream` unless the SDK provides no alternative.
- On the client, use SDK-provided hooks (verify hook names in `node_modules/ai/react/`) rather than hand-rolling streaming logic.
- Do not hard-code model identifiers as raw strings scattered across files. Centralise model config in a single file (e.g., `app/lib/ai.ts`) and import from there.
- Never log or expose API keys. Read them from environment variables only (`process.env.OPENAI_API_KEY`, etc.).

```ts
// app/lib/ai.ts — centralise model config
import { ... } from 'ai'; // verify exact import from node_modules/ai

export const defaultModel = '...'; // fill in when model is chosen
```

---

## Tailwind CSS v4

**Tailwind v4 is configured in CSS — not in a JS/TS config file.**

- Do not create `tailwind.config.js` or `tailwind.config.ts`.
- Theme customisation uses `@theme` blocks in CSS. Variables customisation uses `@theme` inside the main CSS entry point.
- Utility class names may differ from Tailwind v3. When in doubt, check `node_modules/tailwindcss/` for the current utility list.
- Use `@apply` sparingly — only for truly repeated utility combinations extracted into a component class.
- PostCSS is configured in `postcss.config.mjs` — do not modify it without checking compatibility with Tailwind v4.

```css
/* ✅ correct — Tailwind v4 theme extension */
@import "tailwindcss";

@theme {
  --color-brand: #your-color;
}

/* ❌ wrong — Tailwind v3 pattern, not valid in v4 */
module.exports = { theme: { extend: { colors: { brand: '#...' } } } }
```

---

## ESLint (v9 Flat Config)

- Config lives in `eslint.config.mjs`. Do not add legacy config files.
- Run `npm run lint` to validate. Fix all errors before committing.
- Do not add `eslint-disable` comments to silence errors without a documented reason in the same line.
- `eslint-config-next` is already included — it covers React, React Hooks, and Next.js specific rules.

---

## Environment Variables

- Never commit secrets or API keys.
- Local development uses `.env.local` (already in `.gitignore`).
- For each required variable, add a documented placeholder to `.env.example` (create this file if it doesn't exist).
- Access variables server-side via `process.env.VAR_NAME`. Client-side variables must be prefixed with `NEXT_PUBLIC_`.

```bash
# .env.example — document every required variable
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=             # Required for AI features
```

---

## Code Style

- **Formatting**: No Prettier config is present. Keep formatting consistent with what already exists in each file. If a formatter is added, update this section.
- **Imports**: Use absolute imports from the project root (configured in `tsconfig.json`). Do not use relative `../../` traversals more than one level deep.
- **Named exports**: Prefer named exports for components and utilities. Use default export only for Next.js page/layout/route files (which Next.js requires as default).
- **File naming**: `kebab-case` for directories and files. Components use `PascalCase` for the exported name but `kebab-case` for the filename (e.g., `app/components/chat-input.tsx` exports `ChatInput`).
- **No barrel files** (`index.ts` re-exporting everything) — they break tree-shaking in the App Router.

---

## What Does Not Exist Yet

The following were planned but have not been committed. Do not fabricate stubs, configs, or references for them until they are added:

- **Python layer** — no `requirements.txt`, `pyproject.toml`, or Python files exist. Do not create Python files without explicit instruction.
- **Dockerfile / docker-compose** — no container config is committed. Do not add or reference one.
- **GitHub Actions workflows** — no `.github/` directory exists. Do not reference CI commands.
- **Test framework** — no Jest, Vitest, or Playwright config exists. Do not write `*.test.ts` or `*.spec.ts` files without a test runner being configured first.

When any of the above are added, **update this file immediately** with the relevant commands and conventions.

---

## Updating This File

This file is the single source of truth for agent behaviour. Update it when:
- A new dependency is added with non-obvious usage patterns.
- A convention is established or changed during a session.
- A new tool (tests, Docker, CI) is configured.
- The product purpose is clarified.

Keep entries precise and specific. Remove any entry that no longer reflects the actual codebase.
<!-- END:nextjs-agent-rules -->