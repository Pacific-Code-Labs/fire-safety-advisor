# sokol — Sóköl landing

The public marketing site at **https://sokol.jcampos.dev**: NFPA fire-protection guidance for
Costa Rica. Static, content-driven, bilingual (es/en), SEO-prerendered.

- Sign in, the demo and the product live in the app: **https://app.sokol.jcampos.dev**
  (`sokol-app`), opened in a new tab.
- Content is edited online in the private admin console (`sokol-admin`). Each page load fetches
  published documents from the public API before rendering; cached or bundled content is the
  fallback when the API is unavailable.

```bash
pnpm install
pnpm dev     # http://127.0.0.1:5173/es
pnpm build   # checks + vite build + SEO prerender + bundle check
```

See `CLAUDE.md` for the rules and architecture.
