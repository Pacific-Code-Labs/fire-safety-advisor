// The ONLY importer of the landing's content JSON (landing-dxp-builder §4). Editors change the
// documents online in the admin console (fire-code-admin → public API, site "landing"); the
// bundled files are the fallback so the site never depends on the API to render.
//
// initContent() uses the last published copy this browser saw (sync, before first paint);
// refreshContent() fetches fresh documents in the background and reports whether they differ
// from what is on screen (main.tsx then re-renders).
import hero from "@/content/hero.json";
import problems from "@/content/problems.json";
import solutions from "@/content/solutions.json";
import features from "@/content/features.json";
import howItWorks from "@/content/how-it-works.json";
import cta from "@/content/cta.json";
import footer from "@/content/footer.json";
import branding from "@/content/branding.json";
import themes from "@/content/themes.json";
import seo from "@/content/seo.json";
import media from "@/content/media.json";
import { cachedPublishedContent, loadPublishedContent } from "@pacific-code-labs/fire-code-design-system";

const env = import.meta.env;
const PUBLIC_API =
  env.VITE_PUBLIC_API_URL && env.VITE_PUBLIC_IDENTITY_POOL_ID
    ? { url: env.VITE_PUBLIC_API_URL, identityPoolId: env.VITE_PUBLIC_IDENTITY_POOL_ID }
    : null;

// Document keys = file names without .json (the admin manifest and the public API use the same).
const BUNDLED: Record<string, unknown> = {
  hero,
  problems,
  solutions,
  features,
  "how-it-works": howItWorks,
  cta,
  footer,
  branding,
  themes,
  seo,
  media,
};

let published: Record<string, unknown> = {};
const doc = <T>(key: string, bundled: T): T => (published[key] as T | undefined) ?? bundled;

export function initContent(): void {
  published = cachedPublishedContent("landing") ?? {};
}

export async function refreshContent(): Promise<boolean> {
  const fresh = await loadPublishedContent(PUBLIC_API, "landing");
  if (!fresh) return false;
  const changed = Object.entries(fresh).some(
    ([key, value]) => JSON.stringify(value) !== JSON.stringify(published[key] ?? BUNDLED[key]),
  );
  published = fresh;
  return changed;
}

export type HeroContent = typeof hero;
export type ProblemsContent = typeof problems;
export type SolutionsContent = typeof solutions;
export type FeaturesContent = typeof features;
export type HowItWorksContent = typeof howItWorks;
export type CtaContent = typeof cta;
export type FooterContent = typeof footer;
export type BrandingContent = typeof branding;
export type ThemesContent = typeof themes;
export type SeoContent = typeof seo;
export type MediaContent = typeof media;

export const getHero = (): HeroContent => doc("hero", hero);
export const getProblems = (): ProblemsContent => doc("problems", problems);
export const getSolutions = (): SolutionsContent => doc("solutions", solutions);
export const getFeatures = (): FeaturesContent => doc("features", features);
export const getHowItWorks = (): HowItWorksContent => doc("how-it-works", howItWorks);
export const getCta = (): CtaContent => doc("cta", cta);
export const getFooter = (): FooterContent => doc("footer", footer);
export const getBranding = (): BrandingContent => doc("branding", branding);
export const getThemes = (): ThemesContent => doc("themes", themes);
export const getSeo = (): SeoContent => doc("seo", seo);
export const getMedia = (): MediaContent => doc("media", media);
