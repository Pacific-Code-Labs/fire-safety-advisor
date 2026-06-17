import type { LucideIcon } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { pickLang } from "@/lib/content-lang";
import { resolveIcon } from "@/lib/icons";
import {
  getHero,
  getProblems,
  getSolutions,
  getFeatures,
  getHowItWorks,
  getCta,
  getFooter,
} from "@/repositories/landing.repository";

/**
 * Landing services (landing-dxp-builder §4). Each resolves the active language
 * via `pickLang` and the icon via `resolveIcon`, so the public component reads
 * plain strings + ready `LucideIcon`s — no `lang === "es" ? …` branching and no
 * icon-per-id maps in JSX.
 */

export interface CardVM {
  id: string;
  Icon: LucideIcon;
  title: string;
  description: string;
}

export interface HeroVM {
  BadgeIcon: LucideIcon;
  badge: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trust: string;
}

export interface SectionHeadingVM {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export interface CtaVM {
  title: string;
  subtitle: string;
  button: string;
}

export interface FooterVM {
  rights: string;
  demoLink: string;
}

export function getHeroVM(lang: Lang): HeroVM {
  const h = getHero();
  return {
    BadgeIcon: resolveIcon(h.badgeIconName),
    badge: pickLang(h.badge, lang),
    title: pickLang(h.title, lang),
    subtitle: pickLang(h.subtitle, lang),
    ctaPrimary: pickLang(h.ctaPrimary, lang),
    ctaSecondary: pickLang(h.ctaSecondary, lang),
    trust: pickLang(h.trust, lang),
  };
}

export function getProblemsVM(lang: Lang): { heading: SectionHeadingVM; cards: CardVM[] } {
  const p = getProblems();
  return {
    heading: { eyebrow: pickLang(p.eyebrow, lang), title: pickLang(p.title, lang) },
    cards: p.items.map((it) => ({
      id: it.id,
      Icon: resolveIcon(it.iconName),
      title: pickLang(it.title, lang),
      description: pickLang(it.description, lang),
    })),
  };
}

export function getSolutionsVM(lang: Lang): { heading: SectionHeadingVM; cards: CardVM[] } {
  const s = getSolutions();
  return {
    heading: {
      eyebrow: pickLang(s.eyebrow, lang),
      title: pickLang(s.title, lang),
      subtitle: pickLang(s.subtitle, lang),
    },
    cards: s.items.map((it) => ({
      id: it.id,
      Icon: resolveIcon(it.iconName),
      title: pickLang(it.title, lang),
      description: pickLang(it.description, lang),
    })),
  };
}

export function getFeaturesVM(lang: Lang): { heading: SectionHeadingVM; cards: CardVM[] } {
  const f = getFeatures();
  return {
    heading: { eyebrow: pickLang(f.eyebrow, lang), title: pickLang(f.title, lang) },
    cards: f.items.map((it) => ({
      id: it.id,
      Icon: resolveIcon(it.iconName),
      title: pickLang(it.title, lang),
      description: pickLang(it.description, lang),
    })),
  };
}

export function getHowItWorksVM(lang: Lang): { heading: SectionHeadingVM; cards: CardVM[] } {
  const h = getHowItWorks();
  return {
    heading: { eyebrow: pickLang(h.eyebrow, lang), title: pickLang(h.title, lang) },
    cards: h.steps.map((it) => ({
      id: it.id,
      Icon: resolveIcon(it.iconName),
      title: pickLang(it.title, lang),
      description: pickLang(it.description, lang),
    })),
  };
}

export function getCtaVM(lang: Lang): CtaVM {
  const c = getCta();
  return {
    title: pickLang(c.title, lang),
    subtitle: pickLang(c.subtitle, lang),
    button: pickLang(c.button, lang),
  };
}

export function getFooterVM(lang: Lang): FooterVM {
  const f = getFooter();
  return {
    rights: pickLang(f.rights, lang),
    demoLink: pickLang(f.demoLink, lang),
  };
}
