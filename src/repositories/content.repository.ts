// The ONLY importer of the landing's content JSON (landing-dxp-builder §4). Editors change the
// documents online in the admin console (sokol-admin → public API, site "landing"); the
// bundled files are the fallback if the API is unavailable.
//
// initContent() loads the last published copy this browser saw; refreshContent() fetches current
// documents before main.tsx renders the site.
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
import { cachedPublishedContent, loadPublishedContent } from "@pacific-code-labs/sokol-design-system";
import { PUBLIC_API } from "@/config/publicApi";

let published: Record<string, unknown> = {};
const doc = <T>(key: string, bundled: T): T => (published[key] as T | undefined) ?? bundled;

export function initContent(): void {
  published = cachedPublishedContent("landing") ?? {};
}

export async function refreshContent(): Promise<void> {
  const fresh = await loadPublishedContent(PUBLIC_API, "landing");
  if (fresh) published = fresh;
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
/** The bundled footer, for fields a published footer from an older shape lacks. */
export const getBundledFooter = (): FooterContent => footer;
export const getBranding = (): BrandingContent => doc("branding", branding);
export const getThemes = (): ThemesContent => doc("themes", themes);
export const getSeo = (): SeoContent => doc("seo", seo);
export const getMedia = (): MediaContent => doc("media", media);
