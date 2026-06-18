// Post-build static prerender (landing-dxp-builder seo-deploy.md, Layer 1).
//
// Runs AFTER `vite build` (wired into the `build` script). For every
// language × route it writes dist/<lang>/<slug>/index.html with that route's
// <title>, description, canonical, hreflang alternates (one per language +
// x-default), OG/Twitter tags, <html lang>, and JSON-LD (WebPage +
// BreadcrumbList). Also writes sitemap.xml (with hreflang alternates), a root
// index.html canonical-ing to the default language, and a noindex 404.html SPA
// fallback. Crawlers/social/AI that don't run JS get correct per-page metadata;
// the SPA still hydrates and updates head tags at runtime (Layer 2, src/lib/seo.ts).
//
// When you ADD/RENAME a public route: add it to seo.json.pages AND the ROUTES
// list below (and the IndexNow slug list in the deploy workflow).
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist");

const seo = JSON.parse(await fs.readFile(path.join(ROOT, "src/content/seo.json"), "utf8"));

const LANGS = ["es", "en"];
const DEFAULT_LANG = "es";
// Keep in sync with the router + seo.json.pages.
const ROUTES = ["home", "demo", "pricing"];

const siteUrl = (seo.siteUrl ?? "").replace(/\/$/, "");
const slugOf = (route) => (route === "home" ? "" : `/${route}`);
const ogImage = /^https?:\/\//.test(seo.ogImage ?? "")
  ? seo.ogImage
  : `${siteUrl}${seo.ogImage?.startsWith("/") ? "" : "/"}${seo.ogImage ?? "/og-image.png"}`;

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function meta(route, lang) {
  const page = seo.pages?.[route]?.[lang] ?? seo.pages?.[route]?.[DEFAULT_LANG];
  return {
    title: page?.title ?? seo.defaultTitle?.[lang] ?? seo.defaultTitle?.[DEFAULT_LANG] ?? "",
    description: page?.description ?? seo.defaultDescription?.[lang] ?? seo.defaultDescription?.[DEFAULT_LANG] ?? "",
  };
}

// The Vite-built SPA shell (has the hashed module <script>, CSS <link>, and the
// <div id="root">). base="/" → asset URLs are root-absolute, so the bundle loads
// correctly even from a nested /es/demo/index.html. We INJECT per-route SEO head
// tags into THIS shell (rather than emitting an SEO-only stub) so every
// prerendered page both ranks AND boots the React app. (Read once, up front,
// BEFORE we overwrite the root index.html with the redirect shell below.)
const SPA_SHELL = await fs.readFile(path.join(OUT, "index.html"), "utf8");

/** Inject per-route SEO tags into the real SPA shell, keeping the app bootable. */
function injectSeo(shell, { lang, title, description, canonical, route, noindex }) {
  const slug = slugOf(route);
  const alternates = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}${slug}" />`,
  ).join("\n    ");
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${siteUrl}${slug || "/"}" />`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: title, description, url: canonical, inLanguage: lang },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          ...(route === "home" ? [] : [{ "@type": "ListItem", position: 2, name: title, item: canonical }]),
        ],
      },
    ],
  };
  const headBlock = [
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? '<meta name="robots" content="noindex,follow" />' : '<meta name="robots" content="index,follow" />',
    `<link rel="canonical" href="${canonical}" />`,
    alternates,
    xDefault,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");

  let html = shell;
  // <html lang> for this page
  html = html.replace(/<html[^>]*>/i, `<html lang="${lang}">`);
  // Replace the shell's <title> (or insert one) + strip any SEO tags it carries,
  // so we don't end up with duplicates after injecting ours.
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  } else {
    html = html.replace(/<\/head>/i, `  <title>${esc(title)}</title>\n  </head>`);
  }
  html = html
    .replace(/\s*<meta\s+name="description"[^>]*>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/\s*<link\s+rel="alternate"\s+hreflang=[^>]*>/gi, "")
    .replace(/\s*<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");
  // Inject the fresh SEO block immediately before </head>.
  html = html.replace(/<\/head>/i, `    ${headBlock}\n  </head>`);
  return html;
}

let written = 0;
for (const lang of LANGS) {
  for (const route of ROUTES) {
    const { title, description } = meta(route, lang);
    const canonical = `${siteUrl}/${lang}${slugOf(route)}`;
    const html = injectSeo(SPA_SHELL, { lang, title, description, canonical, route });
    const dir = path.join(OUT, lang, route === "home" ? "" : route);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), html);
    written++;
  }
}

// sitemap.xml with hreflang alternates.
const urlEntries = LANGS.flatMap((lang) =>
  ROUTES.map((route) => {
    const loc = `${siteUrl}/${lang}${slugOf(route)}`;
    const alts = LANGS.map(
      (l) => `      <xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}${slugOf(route)}" />`,
    ).join("\n");
    return `  <url>\n    <loc>${loc}</loc>\n${alts}\n  </url>`;
  }),
).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>
`;
await fs.writeFile(path.join(OUT, "sitemap.xml"), sitemap);

// 404.html: a noindex copy of the SPA shell so hard refreshes on client routes
// (e.g. /es/projects/123) resolve. (Read the SPA shell BEFORE we overwrite the
// root index.html below.)
const spaShell = await fs.readFile(path.join(OUT, "index.html"), "utf8");
const notFound = spaShell.replace(
  /<head>/,
  '<head>\n    <meta name="robots" content="noindex,follow" />',
);
await fs.writeFile(path.join(OUT, "404.html"), notFound);

// Root index.html: since ALL routes are language-prefixed (/:lang/...), the bare
// "/" must land on the default language. Overwrite the SPA shell at the root with
// a tiny redirect shell to "/<DEFAULT_LANG>" (meta-refresh + canonical + a
// noscript fallback link). Deep links still hydrate via the per-language
// prerendered pages + the SPA fallback (404.html); crawlers use the sitemap.
const rootRedirect = `<!doctype html>
<html lang="${DEFAULT_LANG}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0;url=/${DEFAULT_LANG}" />
    <link rel="canonical" href="${siteUrl}/${DEFAULT_LANG}" />
    <title>FireCode CR</title>
  </head>
  <body>
    <noscript><a href="/${DEFAULT_LANG}">Continue</a></noscript>
    <script>location.replace("/${DEFAULT_LANG}");</script>
  </body>
</html>
`;
await fs.writeFile(path.join(OUT, "index.html"), rootRedirect);

console.log(`[prerender] wrote ${written} page(s) + sitemap.xml + noindex 404.html + root redirect shell → ${path.relative(ROOT, OUT)}`);
