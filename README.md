# sokol — Sóköl landing

The public marketing site at **https://fire-code.jcampos.dev**: NFPA fire-protection guidance for
Costa Rica. Static, content-driven, bilingual (es/en), SEO-prerendered.

- Sign in, the demo and the product live in the app: **https://app.fire-code.jcampos.dev**
  (`sokol-app`), opened in a new tab.
- Content is edited online in the private admin console (`sokol-admin`) and shows up here
  within a minute; the bundled `src/content/*.json` is the fallback.

```bash
pnpm install
pnpm dev     # http://127.0.0.1:5173/es
pnpm build   # checks + vite build + SEO prerender + bundle check
```

See `CLAUDE.md` for the rules and architecture.
