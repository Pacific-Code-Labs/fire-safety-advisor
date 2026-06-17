# CLAUDE.md — `fire-code-fe` (FireCode CR frontend)

Guidance for AI agents (and humans) working in this repo. Read this before making changes.

---

## 1. Purpose

`fire-code-fe` is the FireCode CR web app: a React SPA that helps interpret **NFPA fire-protection standards for Costa Rica**. It lets a user describe a building (type, area, usage, floors, occupants, ceiling height, volume), filters the applicable rules, shows them grouped by fire-protection category, and exposes an AI chat assistant that calls the backend `/evaluate` endpoint (deterministic filter + Azure AI Foundry agent).

It talks to the `fire-code-cr-be` backend (`E:\dev\fire-code-app\fire-code-cr-be`) via a typed REST client. Live API default: `https://fire-code-api.jcampos.dev`. Live site is GitHub Pages.

---

## 2. Tech stack

- **React 18 + TypeScript + Vite** (SWC plugin). Path alias `@` → `src` (configured in `vite.config.ts` and `tsconfig`).
- **Tailwind CSS + shadcn/ui** — the brand-neutral shadcn primitives now ship from the DS package; only the API-divergent/branded + app-specific set remains under `src/components/ui/*` (config in `components.json`, `tailwind.config.ts`). See §10.
- **`@pacific-code-labs/fire-code-design-system`** (FCR-003 / FCR-086) — shared brand primitives + theme engine, consumed from **GitHub Packages** (`^0.1.1`, registry dep + `.npmrc`). Supplies both the canonical branded primitives and the absorbed shadcn set; see §10.
- **TanStack Query** for server state (`QueryClient` in `App.tsx`).
- **AWS Amplify v6** for auth + the REST API binding.
- **react-router-dom v6** for routing.
- **react-hook-form + zod** for forms; **sonner** + shadcn toaster for toasts; **lucide-react** icons; **recharts** for charts.
- **Bun** is the package manager / build runner (`bun install`, `bun run build`). `npm`/lockfile exists but Bun is canonical for CI.
- **Vitest** + Testing Library + jsdom for tests (`src/test/setup.ts`).

Commands: `bun run dev` (port 8080), `bun run build`, `bun run build:dev`, `bun run preview`, `bun run lint`, `bun run test`, `bun run test:watch`.

---

## 3. Structure

```
src/
├── main.tsx                 # entry — MUST import "./config/amplify" first (configures Amplify before any API call)
├── App.tsx                  # providers + routes (see provider order below)
├── index.css                # design-token system (see §6)
├── config/
│   └── amplify.ts           # Amplify.configure: Cognito (guest access) + REST API "FireCodeApi"
├── pages/                   # route screens: Landing, Index (demo), Login, Dashboard, Evaluator,
│                            #   Projects, NewProject, ProjectDetail, NotFound
├── components/
│   ├── ui/                  # shadcn primitives (generated; prefer editing tokens over forking these)
│   ├── assistant/           # assistant message renderers: TextMessage, EvaluationCard, ProjectCard
│   ├── GlobalAssistant.tsx  # floating launcher + slide-over panel (mounts ChatPanel)
│   ├── ChatPanel.tsx        # chat loop: calls fireCodeApi.evaluate, normalizes + renders responses
│   ├── DashboardLayout.tsx, Header.tsx, NavLink.tsx, ThemeToggle.tsx
│   ├── BuildingSelector.tsx, CategoryCard.tsx, RuleDetailModal.tsx, RiskBadge.tsx
│   └── RequireAuth.tsx      # route guard — redirects to /login when no Cognito user
├── services/
│   └── fireCodeApi.ts       # typed API client (see §4)
├── contexts/
│   ├── AuthContext.tsx      # Cognito user pool sign-in/up/confirm/signOut + getAccessToken
│   ├── LangContext.tsx      # bilingual es/en (default "es")
│   ├── ThemeContext.tsx     # light/dark
│   └── AssistantContext.tsx # global assistant open state, message list, input + pageContext
├── hooks/
│   ├── useProjects.ts       # API-backed via TanStack Query (FCR-025): useProjects() list+create/update/remove + useProject(id) detail; hits /projects* (authenticated)
│   ├── use-mobile.tsx, use-toast.ts
├── lib/
│   ├── assistantResponse.ts # response normalizer (see §5)
│   ├── i18n.ts              # translation dictionaries t.es / t.en (see §7)
│   ├── engine.ts, utils.ts  # cn() classname merge
└── data/knowledgeBase.ts    # static reference data
```

**Provider order** (`App.tsx`, outermost → innermost): `QueryClientProvider → ThemeProvider → AuthProvider → LangProvider → AssistantProvider → TooltipProvider → BrowserRouter`. Keep this order; contexts below depend on those above.

**Routes:** `/` Landing (public), `/demo` Index (public demo). **Auth flow (FCR-060, public):** `/login`, `/register` (2-step: info+locale → password+strength meter), `/verify-email` (OTP `confirmSignUp` → auto sign-in), `/forgot-password` + `/reset-password` (3-step recovery). Auth-guarded via `RequireAuth`: `/dashboard`, `/dashboard/evaluator`, `/dashboard/profile` (edit name/username + change password), `/dashboard/roles` (RBAC roles management, FCR-061), `/organizations/new` (thin placeholder — BE auto-provisions), `/projects`, `/projects/new`, `/projects/:id`. Catch-all `*` → NotFound (keep custom routes above it).

**Org-facing RBAC UI (FCR-061):** ported/adapted from the POS reference onto FireCode libs. Built on `GET /me` (`hooks/useMe.ts`, key `["me"]` → `{userId(Cognito sub), organizationId, role, tier, platformRole}`) which supplies the userId+orgId for the org-scoped RBAC paths `/users/{userId}/organization/{orgId}/rbac/...`. `services/rbacApi.ts` is a typed Bearer-authed client (Amplify `get/post/put/del` on `FireCodeApi`) for `getMe` + O1–O14 (mirrors BE `dtos/rbac_dto.py`/`me_dto.py` in `types/rbac.ts`); it throws `RoleInUseError` on a 409 role delete (O8) and `PermissionSubsetError` on a 400 grant-subset violation (O10, parses the offending tuples). `hooks/useRbac.ts` exposes the queries/mutations (keys `["rbac",...,orgId]`) plus **`usePermissions()`** — `can(module,action,submodule?)`/`hasModule(name)`/`isOwner`/`isAdmin`/`isReady`/`role`, over the flattened `"module:submodule:action"` strings from O1 (the BE pre-expands module-wide grants). **`usePermissions` is FAIL-OPEN while the BE runs `RBAC_ENFORCEMENT=log`** (`can`/`hasModule` return `true` until O1 resolves) so nothing locks out during rollout — there's an explicit `TODO(FCR-029)` to flip it fail-closed in the same change the BE flips to `enforce`. `pages/RolesPage.tsx` (route-gated on `can('admin','read','roles')` once `isReady`) lists system templates (view+duplicate) vs custom org roles (per-verb gated CRUD) + `components/roles/RoleDrawerForm.tsx` + `PermissionMatrix.tsx` (rendered ONLY from the O2 org-filtered available matrix; `grantsFromPermissions`/`grantsToPermissions` expand module-wide `submoduleId:null` rows + drop stale grants + bridge action name↔id via the O13 catalog). Sidebar gating lives in `DashboardLayout.tsx`: `NAV_PERMISSION: Record<NavId,[module,submodule]>` mirrors the seeded catalog 1:1 (dashboard→panel/overview, projects→projects/projects, evaluator→projects/evaluator, roles→admin/roles); `itemVisible(id)=!perm||!isReady||can(module,'read',sub)` hides items, and whole groups hide when empty. Strings bilingual via `rbac_*`/`roles_*`/`nav_roles`/`nav_admin` keys in `lib/i18n.ts`. `lib/rbacI18n.ts` translates catalog modules/submodules/actions/roles by their stable `name` with a server-`displayName` fallback.

**Auth/profile flow (FCR-060):** screens live in `pages/{Login,Register,VerifyEmail,ForgotPassword,ResetPassword,ProfilePage,NewOrganization}.tsx`, built on **`@pacific-code-labs/fire-code-design-system`** primitives (`Button/Input/Select/FormField/OtpInput/Card`) via shared `components/auth/{AuthShell,PasswordField,PasswordStrengthIndicator}.tsx` + zod schemas in `lib/authSchemas.ts`. `AuthContext` (Amplify v6) exposes `signIn/signUp/confirmSignUp/resendCode/resetPassword/confirmResetPassword/updatePassword/updateProfile/forceLogout/applyProfileUpdate` plus session-restore on mount. **Profile is Cognito-attribute-backed** (`given_name/family_name/preferred_username/email/locale` via `fetchUserAttributes`/`updateUserAttributes`) — there is NO BE profile endpoint; the BE auto-provisions the personal org + owner role on the first authenticated call (FCR-008/021), so there's no FE org-create form (the `/organizations/new` page just documents this). All strings bilingual via `lib/i18n.ts` (`auth_*`/`profile_*`/`val_*` keys).

---

## 4. API client — `src/services/fireCodeApi.ts`

Single typed client object `fireCodeApi`:

- `getRules(params?)` → `GET /rules` — rules grouped by category (`RuleGroupDTO[]` + pagination). All filter params optional.
- `getRuleById(ruleId)` → `GET /rules/{id}` — returns `RuleDTO | null` (null on 404 via `isNotFound`).
- `evaluate(request)` → `POST /evaluate` — deterministic filter + AI agent (authenticated). `EvaluateResponse.foundryUsed` indicates whether the AI was reached. On HTTP 429 (monthly evaluate quota, FCR-026) it rethrows a typed **`QuotaError`** (`kind:"evaluate"`).
- `evaluateDemo(request)` → `POST /demo/evaluate` (FCR-047) — PUBLIC, throttled demo evaluation used by the `/demo` page. Sends `demo:true`; the backend forces demo mode (teaser answer, never creates projects) and caps successful AI evals per visitor/day. On HTTP 429 it rethrows a typed **`DemoLimitError`** carrying the `DemoLimitResponse` CTA payload (`type:"demo_limit"`, `message`, `limit`, `cta`, `ctaAction`, `ctaHref`).
- **Projects (FCR-025, authenticated):** `listProjects(params?)` → `GET /projects`, `getProject(id)` → `GET /projects/{id}` (null on 404), `createProject(body)` → `POST /projects`, `updateProject(id,body)` → `PUT /projects/{id}`, `deleteProject(id)` → `DELETE /projects/{id}`. All send `authHeader()`. FE DTOs (`ProjectResponse`/`ProjectListResponse`/`ProjectCreateRequest`/`ProjectUpdateRequest`) mirror the BE `project_dto.py` (camelCase response aliases, lowercase-string `building_type`). `createProject`/`updateProject` rethrow a typed **`QuotaError`** (`kind:"saved_projects"`) on HTTP 402 (saved-projects plan limit, FCR-026). These are consumed via `hooks/useProjects.ts` (TanStack Query) — pages do not call the client directly.

**`QuotaError` (FCR-026):** carries `payload` (`{type:"quota_exceeded",message,limit,current?,resource?,tier?,remaining?,reset?}`), `kind` (`"saved_projects"`|`"evaluate"`), and `status` (`402`|`429`). The body is parsed from the FastAPI `detail`-wrapped or top-level shape; for the 429 evaluate gate, `limit/remaining/reset` are backfilled from the `X-Quota-*` response headers. `components/UpgradeModal.tsx` (DS `Modal`, bilingual) renders it; it's wired into `NewProject.tsx` (create flow) and `ChatPanel.tsx` (authenticated evaluator path — the public demo keeps `DemoLimitError`).

DTOs (`RuleDTO`, `RuleGroupDTO`, `EvaluateResponse`, etc.) mirror the backend contract — keep them in sync with `fire-code-cr-be`. `BuildingType` and `RuleCategory` are numeric enums matching backend IDs.

**Auth today (SigV4):** requests use Amplify's `get`/`post` against the `FireCodeApi` REST binding (`config/amplify.ts`). The Cognito **Identity Pool** with `allowGuestAccess: true` issues anonymous credentials, and Amplify **SigV4-signs** every request — no login required for browsing/evaluating. `AuthContext` separately manages the Cognito **User Pool** (email sign-up/confirm/sign-in) for the saved-projects experience.

> **FCR-010 (Cognito User Pool authorizer) — BACKEND LANDED 2026-06-15.** The backend API Gateway generator (`fire-code-be/scripts/gen_api_template.py`) now declares a Cognito **User Pool** authorizer (`FireCodeCognitoAuthorizer`, `x-amazon-apigateway-authtype: cognito_user_pools`) and classifies each route per-route via a `ROUTE_AUTH` prefix map:
> - **Public (no auth):** `/health`, `/rules*`, `/demo/*` (future), `/webhooks/paypal` (future).
> - **Authenticated (Cognito authorizer):** `/projects*`, `/evaluate`, `/billing*` (future).
>
> **FE action (FCR-060 / FCR-010 FE) — LANDED.** Authenticated calls now send `Authorization: Bearer <Cognito accessToken>` (the User Pool **access token**, NOT the SigV4 request and NOT the id token). Wiring: `services/authToken.ts` holds a swappable access-token provider (defaults to reading the session via Amplify; `AuthContext` registers its memoized `getAccessToken` on mount via `setAccessTokenProvider`); `fireCodeApi.evaluate` calls `authHeader()` and passes the Bearer header in the request `options.headers`. **Public calls (`/rules*`, `/health`, `/demo/*`) send no Authorization header** and keep the SigV4/guest path. `/projects*` is now on the live API (FCR-025) and threads `authHeader()` the same way; future `/billing*` too. The authorizer responds 401 on a missing/invalid token. **Do not silently rip out SigV4** for public/guest browsing — keep the guest path for public routes; update this section + the roadmap row when the FE wiring lands. Note: `/evaluate` is authenticated, so the anonymous demo uses the public `/demo/evaluate` route (FCR-047 — **landed**): the `/demo` page (`Index.tsx`, `embedded=false`) renders `ChatPanel` with the `demo` prop, which calls `fireCodeApi.evaluateDemo` (sends `demo:true` + `context.page:"demo"`) and renders a sign-up CTA (`DemoLimitCard`) on the 429 daily-cap response.

---

## 5. Assistant module

Files: `GlobalAssistant.tsx` (floating launcher + responsive slide-over), `ChatPanel.tsx` (the chat loop), `components/assistant/*` (renderers), `contexts/AssistantContext.tsx` (shared open/message/input/pageContext state), and the normalizer `lib/assistantResponse.ts`.

Flow: user asks → `ChatPanel.ask()` calls `fireCodeApi.evaluate(...)` → raw response passed to `normalizeAssistantResponse(raw)` → rendered by type.

**The 3 response modes** (`NormalizedResponse` in `assistantResponse.ts`). Backend may return `{ type, data }`; a raw `EvaluateResponse` with no `type` is treated as `evaluation` for backward compat; anything else degrades to a `message`.

1. **`evaluation`** — `EvaluateResponse` (matched rules, requirements, references, risk, `foundryUsed`). `contextCr` is now **structured `CrContextItem[] {topic,detail,authority?,reference?}`** (FCR-043); `EvaluationCard` renders topic/detail + an authority·reference suffix and tolerates legacy `string[]`. ChatPanel builds a bilingual summary line. **FCR-042:** `ChatPanel.ask()` sends a trimmed `conversation` (last ~10 turns, mapped from the message list to `{role,content}`) + a `context` `{page, project?}` derived from `AssistantContext.pageContext`. **FCR-044:** it no longer fabricates `building_type`/`usage` defaults — it sends the real selected values or omits them.
2. **`message`** — `{ message: string }`. Plain text via `TextMessage`.
3. **`project_created`** — `ProjectCreatedData` (name, usage, buildingType, keyRequirements…). Rendered with `ProjectCard` + success toast.

**Demo throttle CTA (FCR-047):** `ChatPanel` takes a `demo` prop. When set (the public `/demo` page) `ask()` calls `fireCodeApi.evaluateDemo` and sends `context.page:"demo"` + `demo:true`. On the 429 daily-cap response `evaluateDemo` throws a typed `DemoLimitError`; `ChatPanel` catches it, pushes a `Msg` of type `demo_limit`, and renders the sign-up call-to-action via `components/assistant/DemoLimitCard`. This is an error-path UX (not a `{type,data}` response), so it lives as a `Msg` type + renderer rather than in the `assistantResponse.ts` normalizer.

`Msg` (in `ChatPanel.tsx`) carries `role`, `text`, a `type` discriminator (`message|evaluation|project|error`), and `payload`. The legacy `answer` field is kept for backward compatibility — `renderAssistantBody` falls back to it. Preserve this normalize-then-discriminate shape when extending: add new modes in `assistantResponse.ts` AND a renderer in `components/assistant/`, never inline ad-hoc parsing in `ChatPanel`.

---

## 6. Design-token system — `src/index.css`

All colors are **HSL** and exposed as **semantic CSS custom properties** in `:root` (light) and `.dark` (dark). Categories:

- **Core semantic tokens:** `--background/--foreground`, `--card`, `--popover`, `--primary` (FireCode red `8 90% 54%`) + `--primary-glow`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`; plus gradient/shadow tokens (`--gradient-hero`, `--gradient-panel`, `--shadow-glow`, `--shadow-panel`).
- **`--cat-*`** — the four fire-protection categories: `--cat-initiation`, `--cat-notification`, `--cat-monitoring`, `--cat-actuation` (with `.text-cat-*`, `.bg-cat-*/10`, `.border-cat-*/30` utilities).
- **`--risk-*`** — `--risk-high`, `--risk-medium`, `--risk-low`.
- **`--sidebar-*`** — sidebar surface/foreground/primary/accent/border/ring.

`tailwind.config.ts` maps these tokens to Tailwind colors. **Rule:** never hardcode hex/RGB in components — reference semantic tokens (Tailwind classes or the `.panel`/`.glow-red`/`.text-cat-*` utilities). To restyle, change the token, not the component.

> **Planned migrations:**
> - **FCR-003 — DESIGN SYSTEM WIRED 2026-06-15, REGISTRY-MIGRATED 2026-06-16 (FCR-086).** The shared **`@pacific-code-labs/fire-code-design-system`** package (primitives + runtime theme engine, resolution `override > org > default`) is now a **GitHub Packages registry** dependency (`^0.1.1`; see §10). These same 28-ish token names live in the DS `tokens.css`; this `index.css` stays the **live source of values** (its `:root`/`.dark` blocks win the cascade because the DS stylesheet is imported BEFORE `index.css` in `main.tsx`). Do not fork the token names. The 34 brand-neutral shadcn primitives the DS provides 1:1 were removed from `components/ui/*` and now import from the DS (`import { Button, Card, ... } from "@pacific-code-labs/fire-code-design-system"`); the API-divergent/branded + app-specific set stays local (see §10).
> - **FCR-080** — landing/marketing content migrates to a **DXP content model** (per-entity content JSON, RETROFIT mode via `landing-dxp-builder`), retiring the bilingual ternaries + hardcoded English in favor of per-page content files.

---

## 7. Bilingual (es/en)

`contexts/LangContext.tsx` holds `lang` (default `"es"`), `setLang`, and `tr` = the active dictionary. Strings live in `lib/i18n.ts` (`t.es` / `t.en`). Use `const { lang, tr } = useLang()` and read `tr.<key>`; for the few inline `lang === "es" ? ... : ...` ternaries (e.g. ChatPanel summaries/suggestions), prefer adding dictionary keys over more ternaries. **Never hardcode user-facing English** — this whole layer is slated to fold into the DXP per-page content model (**FCR-080**).

---

## 8. Build & deploy

- **Env vars** (`.env.local`, gitignored; template in `.env.local.example`): `VITE_AWS_REGION`, `VITE_COGNITO_IDENTITY_POOL_ID`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_USER_POOL_CLIENT_ID`, `VITE_API_BASE_URL`. Values come from the Cognito stack outputs in `fire-code-cr-be` (`deploys/deploy-cognito.sh`).
- **CI/CD:** `.github/workflows/deploy-pages.yml` — on push to `main` (or manual dispatch): `oven-sh/setup-bun` → `bun install` → `bun run build` (VITE_* injected from GitHub secrets) → SPA fallback (`cp dist/index.html dist/404.html`) → `.nojekyll` → `actions/deploy-pages`. Deploys to **GitHub Pages**.
- **SPA note:** `vite.config.ts` uses `base: "/"`. GitHub Pages routing relies on the `404.html` fallback copied in CI. If the Pages base path changes, update both `base` and the fallback step.

---

## 9. Roadmap upkeep — REQUIRED for every change

**`E:\dev\fire-code-app\docs\roadmap\firecode_roadmap.md` is the single source of truth** for tracking all FireCode CR work across every repo (be, fe, agent, admin, design-system). Treat it as a living document. After **any substantive change** in this repo you MUST:

1. **Update the relevant `FCR-NNN` row** in §2 (the status board): set the correct **Status** (`Done` / `In progress` / `Planned` / `Not started` / `Won't do`) and update the **Evidence / next step** cell with what landed and what remains.
2. **Append a dated line to the §5 changelog** describing the change (date + short summary, e.g. `2026-06-15: fire-code-fe — added Bearer-token path to fireCodeApi (FCR-010 prep).`).
3. **Add a new `FCR-NNN` row** for newly discovered work — IDs are stable and never reused/renumbered. When splitting an item, keep the original ID on the parent and add child IDs (note lineage).
4. **Never silently drop scope.** Do not delete rows — strike through or mark `Won't do` with a cited decision source.

FCR IDs most relevant to this repo: **FCR-004** (this CLAUDE.md), **FCR-010** (Cognito JWT authorizer / Bearer auth migration), **FCR-003** (shared design system), **FCR-080** (DXP content model), **FCR-025** (`useProjects` off localStorage onto the API + TanStack Query), **FCR-028** (FE billing UI). If your change touches one of these, update its row in the same commit/PR.

---

## 10. Shared design system — `@pacific-code-labs/fire-code-design-system` (FCR-003 / FCR-086)

The brand primitives + theme engine live in the **sibling repo**
`E:\dev\fire-code-app\fire-code-design-system`, **published to GitHub Packages**
as `@pacific-code-labs/fire-code-design-system` (current `^0.1.1`). It exports
the canonical token-driven primitives (Button/Input/Select/FormField/FormLabel/
Card[CardHeader/**CardBody**/CardFooter/CardTitle/CardDescription]/Badge/Icon/
Modal/Drawer/OtpInput/Spinner/Pagination/MediaPicker) PLUS the absorbed
brand-neutral shadcn/Radix primitives (alert, alert-dialog, accordion,
aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox,
collapsible, command, context-menu, dropdown-menu, hover-card, menubar,
navigation-menu, popover, progress, radio-group, resizable, scroll-area,
separator, sheet, skeleton, slider, switch, table, tabs, textarea, toggle,
toggle-group, tooltip, sonner `Toaster`/`toast`), the theme engine
(`applyTheme(themeId, isDark)`, `ThemeProvider`/`useTheme`, resolution
`override > org > default`), the token TS contract, and `tokens.css`.

**How it's wired (FCR-003 consumer migration, LANDED):** `package.json` declares
the **registry** dep `"@pacific-code-labs/fire-code-design-system": "^0.1.1"`
(no more `file:` path, no more `@firecode/design-system`). A repo-root `.npmrc`
points the `@pacific-code-labs` scope at `https://npm.pkg.github.com` and reads
the token from `${NODE_AUTH_TOKEN}`:
```
@pacific-code-labs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```
CI (`deploy-pages.yml`) has `permissions: packages: read` and sets
`NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the `bun install` step, so the
private package resolves in the Pages build.

> **LOCAL vs CI duality.** The committed package.json carries the **registry
> semver** + `.npmrc` (the CI source of truth). For LOCAL tsc/build when you
> have no `read:packages` token, link the sibling into `node_modules` instead of
> editing package.json: e.g. on Windows
> `mklink /J node_modules\@pacific-code-labs\fire-code-design-system E:\dev\fire-code-app\fire-code-design-system`
> (or a temporary `file:` install you DON'T commit). The published `0.1.1` and
> the local sibling are the same code. **Never commit a `file:` dep.**

**Stylesheet:** `main.tsx` imports
`@pacific-code-labs/fire-code-design-system/styles` (the DS `tokens.css`)
**before** `./index.css`. The DS stylesheet supplies token defaults;
`index.css` redefines the SAME token names at equal specificity and, being
imported last, **wins** — so `index.css` remains the live light/dark values (the
source of truth). Do not reorder these imports.

**Tailwind:** `tailwind.config.ts` adds
`./node_modules/@pacific-code-labs/fire-code-design-system/dist/**/*.{js,cjs}`
to the `content` globs so the primitives' classes are emitted. The DS uses the
SAME semantic token names this app maps, and its `--cat-*`/`--risk-*` Badge
styles use arbitrary `hsl(var(--token))` values — so **no extra color-map
entries** are needed. The DS Modal/Drawer need `tailwindcss-animate`
(`animate-in`, `data-[state]`, `slide-in-*`); that plugin is already installed
and registered.

**Theming reconciliation:** the FE keeps its own `contexts/ThemeContext`
(light/dark) as the **live** theme switch. The DS theme engine
(`ThemeProvider`/`applyTheme`) is **available but not yet mounted** — it's the
path for runtime CMS-driven, org-resolved theming (FCR-080 / Lane δ). Do NOT
rip out `ThemeContext` now.

**Primitive consumption (FCR-086):** the 34 brand-neutral shadcn primitives the
DS provides 1:1 were DELETED from `src/components/ui/*`; their import sites now
pull from the DS package. The **API-divergent / branded set stays LOCAL** under
`src/components/ui/*` because their call sites differ from the DS API:
`button`, `card` (local uses `CardContent`; DS renames it `CardBody`), `input`,
`badge`, `dialog` (DS exposes `Modal` instead), `select` (DS `Select` is a
single-element control, not the Radix compound `Select*` set the app uses),
`label` (DS exports `Label` but `form.tsx` consumes the local one), `pagination`,
`input-otp` (DS exports `OtpInput`), `drawer`, plus `form` (depends on local
`label`), the app-specific `sidebar`, and the Radix **toast/toaster/use-toast**
trio (the DS only ships sonner, not the Radix toast). `sidebar.tsx` keeps
`button`/`input` local but now pulls `separator`/`sheet`/`skeleton`/`tooltip`
from the DS. New screens should prefer DS primitives directly.

---

## 11. Landing DXP — content model (FCR-080, `landing-dxp-builder`)

The landing/marketing site is a **DXP**: every user-visible string + icon is
**editable JSON content** bundled at build time (no runtime backend — deploys
100% static). Mode = RETROFIT, admin delivery **variant B (separate admin app +
private repo)**.

> **The admin CMS does NOT live in this repo.** It is a standalone private app
> at `E:\dev\fire-code-app\fire-code-admin` (its own Vite app/port/repo,
> `landing-dxp-builder/references/separate-admin-app.md`). This repo, the public
> site, contains **ZERO admin code** — no `pages/admin`, no `components/admin`,
> no `admin-*`/`local-cms`/`media-upload` libs, no `vite-plugin-local-cms`, no
> `/admin` route, no `ADMIN_ENABLED` gate. It keeps the **content model only**.
> The admin app reads this repo's `src/content/*.json` + `src/translations/*` +
> shared `src/lib/*` as the single source of truth via `@site` path aliases and
> writes them back through its OWN dev-only local-CMS plugin pointed at this
> sibling repo. **Do not re-add admin code here** — edit content via the
> `fire-code-admin` app, or hand-edit the JSON. (FCR-082.)

### Content layout
- `src/content/*.json` — per-entity content (`hero, problems, solutions,
  features, how-it-works, cta, footer, branding, themes, media, seo` + the
  generated `inventory.json`). Copy fields are bilingual `{ es, en }`;
  collections carry an `iconName` token; image fields hold a single string REF
  (root-relative `path` for local items, absolute `url` for external). The
  **only** import site for the landing entities is
  `repositories/{landing,branding}.repository.ts`.

### Media / theming / SEO (FCR-080 MEDIA/SEO/THEME phase, FCR-081)
- **Media library:** `src/content/media.json` is the registry of every
  image/video/audio. `src/lib/media.ts` exports the public-safe resolvers
  (`resolveAssetUrl` for logos/images, `resolveMediaUrl`, `mediaRef` =
  value-to-store, `absoluteAssetUrl` for OG/sitemap). The admin-only MUTATORS
  (`uploadToLibrary`/`addExternalToLibrary`/`removeFromLibrary`) + the
  `MediaPicker` field that edits every image content field live in the
  `fire-code-admin` app, NOT here. Seeded items mirror any image a content field
  references. **`public/og-image.png` is a PLACEHOLDER** — the owner replaces it
  + the logo/favicon set from `BLUE-BOOK.md` §5 prompts.
- **Theming / Site Identity:** `src/content/themes.json` (named-theme array, one
  `isActive`, each maps to a DS engine theme id via `engineThemeId`) +
  `branding.json` are edited in the admin app's Site Identity page.
  `src/lib/brand-theme.ts` (`initBrand()` from `main.tsx`) drives the shared
  `@pacific-code-labs/fire-code-design-system` theme engine (`applyTheme`) to re-skin the site from
  content. **`contexts/ThemeContext` stays the LIVE light/dark switch** and
  re-applies the active brand theme in the new mode on toggle — do NOT rip it out.
- **SEO:** `src/content/seo.json` (siteUrl, default + per-route `{es,en}`
  title/description, `ogImage`, optional GA4 id) edited in the admin app's SEO page.
  `src/lib/seo.ts` (`resolveSeo`/`useHeadTags`) updates head tags on SPA
  navigation (wired into `Landing`, `Index` /demo, `NotFound`→noindex).
  `scripts/prerender.mjs` runs after `vite build` (chained in the `build`
  script) → per-language×route static HTML under `dist/<lang>/<slug>/` +
  `sitemap.xml` + a noindex `404.html`. **When you add/rename a public route:**
  add it to `seo.json.pages` AND the `ROUTES` list in `prerender.mjs`. The
  deploy workflow must NOT `cp index.html→404.html` (it would clobber the
  noindex 404 the prerender emits).
- `src/translations/{es,en}.json` — **fixed UI chrome only** (nav/demo/404
  labels), read via `lib/chrome-i18n.ts` `tChrome(lang)`. NOT per-section copy.
- Read chain: JSON → `repositories/*.repository.ts` → `services/*.service.ts`
  (resolve `Localized→string` via `lib/content-lang.ts` `pickLang` + icon via
  `lib/icons.ts` `resolveIcon`) → public components read plain-string VMs. Never
  branch on language in a component; never hardcode a visible literal.

### No-hardcoded-text rule
Every visible string comes from an editable source: per-entity copy → content
JSON; fixed chrome → i18n (`tChrome`); icons → `iconName` token + `resolveIcon`.
Acceptable in-component literals: `data-testid`, class names, decorative
`aria-hidden` SVGs, the brand name. (The sole remaining `lang === "es"` is the
non-visible toggle computation in `Header.tsx`.) The bilingual-admin-chrome rule
still applies, but it now lives in the `fire-code-admin` repo (this repo has no
admin pages).

### Where the admin lives now (variant B)
The dev-only admin CMS is the separate private app `fire-code-admin` (own
Vite app, own port, own repo). **This repo has no admin code by design** —
deleted: `pages/admin/*`, `components/admin/*`, `lib/{admin-store,admin-ui,
admin-manifest,admin-i18n,admin-enabled,media-upload,local-cms}.ts`,
`vite-plugin-local-cms.ts`; and the `/admin` route + `ADMIN_ENABLED` gate are
gone from `App.tsx`/`vite.config.ts`/`Header.tsx`.

- **Editing content:** run the `fire-code-admin` app (it reads/writes THIS
  repo's `src/content/*.json` + `src/translations/*` via `@site` aliases and its
  own local-CMS plugin), or hand-edit the JSON. The save/publish (write-back +
  `git push`) machinery is the admin app's, not this repo's.
- **Inventory:** regenerate `src/content/inventory.json` with `npm run
  inventory` (`scripts/build-inventory.mjs`) whenever a file under `src/` is
  added/removed/renamed. (`inventory.json` is still bundled here for the admin
  app's Inventory graph, read via `@site`.)
- **Prod build is admin-free by ABSENCE** (not tree-shaking). Verify after any
  change: `vite build` → no `AdminRouter`/`admin/` chunk or strings, and
  `grep -rE "AdminLayout|AdminRouter|__local|/admin|admin-store|publishChanges|uploadToLibrary" dist/`
  returns zero hits.

### How to add a new content entity
1. Add `src/content/<entity>.json` (bilingual `{ es, en }` fields; tokens via
   `iconName`); add it to the `landing` repository + a service VM if public.
2. Swap the public component to read it (no visual change), keeping it bilingual.
3. **Regenerate `inventory.json`** (`npm run inventory`).
4. In the `fire-code-admin` repo, complete the four-pieces admin wiring for it
   (content-store slice + manifest row → sidebar + route + ContentVersions
   download). See that repo's `CLAUDE.md`.
Done (site side) when the entity renders from JSON, is bilingual, `inventory.json`
is regenerated, and the prod build is still admin-free.
