// The ONLY import site for the landing content JSON files (landing-dxp-builder
// §4). Types are inferred from the JSON; services resolve Localized → string.
import hero from "@/content/hero.json";
import problems from "@/content/problems.json";
import solutions from "@/content/solutions.json";
import features from "@/content/features.json";
import howItWorks from "@/content/how-it-works.json";
import cta from "@/content/cta.json";
import footer from "@/content/footer.json";

export type HeroContent = typeof hero;
export type ProblemsContent = typeof problems;
export type SolutionsContent = typeof solutions;
export type FeaturesContent = typeof features;
export type HowItWorksContent = typeof howItWorks;
export type CtaContent = typeof cta;
export type FooterContent = typeof footer;

export const getHero = (): HeroContent => hero;
export const getProblems = (): ProblemsContent => problems;
export const getSolutions = (): SolutionsContent => solutions;
export const getFeatures = (): FeaturesContent => features;
export const getHowItWorks = (): HowItWorksContent => howItWorks;
export const getCta = (): CtaContent => cta;
export const getFooter = (): FooterContent => footer;
