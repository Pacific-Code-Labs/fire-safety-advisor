# CLAUDE.md — `fire-safety-advisor` (FireCode CR landing)

Guidance for AI agents (and humans) working in this repo. Read this before making changes.
The workspace contract (repos, domains, SSM keys, deploy order) is in the root
`Fire-Code-CR/CLAUDE.md`.

---

## 1. Purpose

The **public marketing landing** of FireCode CR at **`https://fire-code.jcampos.dev`**: a static,
content-driven SPA (landing-dxp-builder RETROFIT) with an SEO prerender. It has **no auth, no app
API and no admin code**.

| Site | Repo | Host |
|---|---|---|
| **this landing** | `fire-safety-advisor` (public) | `fire-code.jcampos.dev` |
| signed-in app (+ public `/demo`) | `fire-code-app` (public) | `app.fire-code.jcampos.dev` |
| admin console + online CMS | `fire-code-admin` (private) | `admin.fire-code.jcampos.dev` |

Pages: `/:lang` (Landing: hero, problems, solutions, features, how-it-works, CTA, footer) and
`/:lang/pricing`. Everything the old single site had under `/:lang/{demo,login,register,
verify-email,forgot-password,reset-password,dashboard,organizations,projects}` **redirects to the same
path on the app** (`App.tsx` `AppRedirect`, list in `lib/links.ts` `LEGACY_APP_PATHS`).

## 2. Hard rules

- **Links to the app open in a new tab**, built with `lib/links.ts`:
  `<a href={appHref(lang, "/login")} {...newTab}>` (Sign in, the demo CTAs, Pricing's Free CTA).
- **The bundle carries no user pool, app API or payment config.** Its only build values are
  `VITE_APP_URL`, `VITE_PUBLIC_API_URL` and `VITE_PUBLIC_IDENTITY_POOL_ID` (identity-pool guests may
  only read published content). `pnpm check:bundle` (part of `pnpm build`) fails otherwise.
- **The site never depends on the content API to render** (see §4).
- **No hard-coded user-visible text** (`pnpm check:text`): copy in `src/content/*.json` as
  `{ "es": "…", "en": "…" }`, chrome in `src/translations/{es,en}.json`.

## 3. Stack & commands

React 18 + TypeScript + Vite 5 + Tailwind 3 (design-system preset) + react-router v6, pnpm,
Node 24 in CI. The design system `@pacific-code-labs/fire-code-design-system` is TypeScript source from a
git tag (`github:…#v0.2.0`); `main.tsx` imports its `/styles` before `index.css` so this site's token
values win. Local DS work: `pnpm link ../design-system` (drop the `pnpm.overrides` before committing).

`pnpm dev` (127.0.0.1:5173) · `pnpm build` (check:i18n → check:text → tsc → vite build →
seo:prerender → check:bundle) · `pnpm content:pull` · `pnpm inventory`.

## 4. Content (online CMS with a bundled fallback)

- `src/content/*.json`: `hero, problems, solutions, features, how-it-works, cta, footer, branding,
  themes, media, seo` (+ generated `inventory.json`, for the admin's Inventory graph —
  regenerate with `pnpm inventory` when files under `src/` change).
- **`repositories/content.repository.ts` is the only importer of the JSON.** Getters return the
  published document when there is one, else the bundled file. `main.tsx`: `initContent()` (last
  published copy this browser saw, sync) → render → `refreshContent()` in the background
  (DS `loadPublishedContent`, SigV4 as an identity-pool guest) → re-render only if it changed.
- Editing happens in the hosted admin (`admin.fire-code.jcampos.dev`, site `landing`): a save
  publishes at once and the live site shows it within a minute, no rebuild.
- CI runs `pnpm content:pull` (`scripts/pull-published-content.mjs`) before the build so the
  prerendered HTML matches the published content; the workflow also rebuilds daily.
- Read chain: repository → `services/*.service.ts` (resolve `{es,en}` via `lib/content-lang.ts`,
  icons via `lib/icons.ts`) → components read plain-string view models. Never branch on language
  in a component.
- Theming: `themes.json` + `branding.json` → `lib/brand-theme.ts` (`initBrand()`) → DS
  `applyTheme`; `contexts/ThemeContext` stays the light/dark switch.
- Media: `media.json` + `lib/media.ts` resolvers; uploads (admin) are served from
  `media.fire-code.jcampos.dev` and stored as absolute URLs.

**Add a content entity:** add `src/content/<entity>.json` → getter in `content.repository.ts`
(key = file name) → service VM → component → `pnpm inventory` → add it to the admin manifest
(`fire-code-admin`) and seed it in the public API (`fire-code-public-be`
`scripts/import_site_content.py`). Diagnostics in the admin flags any gap.

## 5. SEO

`src/lib/seo.ts` updates head tags on navigation. `scripts/prerender.mjs` runs after `vite build`:
per language × route (`ROUTES = ["home", "pricing"]`, keep in sync with the router and
`seo.json.pages`) it writes `dist/<lang>/<slug>/index.html` with title, description, canonical,
hreflang, OG and JSON-LD, plus `sitemap.xml`, a noindex `404.html` and a root redirect shell to `/es`.
Never `cp index.html 404.html` here.

## 6. i18n & routing

Routes are language-prefixed (`/:lang/...`, `LangLayout` syncs `LangContext` from the URL);
build links with `localizedPath(lang, "/x")`; the language toggle uses `runLangSwitch`.
`src/translations/{es,en}.json`: `nav`, `notFound` (read via `lib/chrome-i18n.ts` `tChrome`) and
`app.common` (Pricing strings, read as `tr.<key>` via `lib/i18n.ts`).

## 7. Deploy

`.github/workflows/deploy-pages.yml` — push to `main`, daily cron, or manual: pnpm + Node 24 →
assume `secrets.AWS_WEB_BUILD_ROLE_ARN` (read-only OIDC role from `fire-code-infrastructure`
`web/web-params.yml`) → `scripts/load-env-from-ssm.sh dev - --github-env` (only `site/app-url`,
`public-api/{url,identity-pool-id}`) → `pnpm content:pull` → `pnpm build` → GitHub Pages
(`public/CNAME` = `fire-code.jcampos.dev`).
