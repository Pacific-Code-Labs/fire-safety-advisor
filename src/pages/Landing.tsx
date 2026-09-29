import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { useLang } from "@/contexts/LangContext";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { localizedPath } from "@/lib/paths";
import { resolveSeo, useHeadTags } from "@/lib/seo";
import {
  getHeroVM,
  getProblemsVM,
  getSolutionsVM,
  getFeaturesVM,
  getHowItWorksVM,
  getCtaVM,
  type CardVM,
} from "@/services/landing.service";

const Landing = () => {
  const { lang } = useLang();
  // The public demo is a page of this site (it calls the public API as a guest).
  const demoHref = localizedPath(lang, "/demo");

  useHeadTags(resolveSeo("home", lang), lang, "home");

  // Header section links from other pages land here as /<lang>#<section>.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const hero = getHeroVM(lang);
  const problems = getProblemsVM(lang);
  const solutions = getSolutionsVM(lang);
  const features = getFeaturesVM(lang);
  const how = getHowItWorksVM(lang);
  const cta = getCtaVM(lang);

  const renderCard = (
    { id, Icon, title, description }: CardVM,
    opts: { tone?: "primary" | "destructive"; index?: number } = {}
  ) => {
    const tone = opts.tone ?? "primary";
    const toneCls =
      tone === "destructive"
        ? "bg-destructive/10 border-destructive/30 text-destructive"
        : "bg-primary/10 border-primary/30 text-primary";
    return (
      <div key={id} className="relative rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
        {opts.index !== undefined && (
          <div className="absolute top-3 right-3 text-xs font-mono text-primary bg-background border border-primary/30 px-2 py-0.5 rounded">
            0{opts.index + 1}
          </div>
        )}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/30">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${toneCls}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(800px 400px at 70% -10%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(600px 300px at 10% 10%, hsl(var(--primary) / 0.10), transparent 60%)",
          }}
        />
        <div className="container pt-10 pb-14 md:pt-14 md:pb-20 lg:pt-16 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary mb-6">
              <hero.BadgeIcon className="h-3.5 w-3.5" aria-hidden />
              {hero.badge}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              {hero.title}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              {hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to={demoHref}>
                  {hero.ctaPrimary} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">{hero.ctaSecondary}</a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{hero.trust}</p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-border">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl mb-8 md:mb-10">
            <div className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">{problems.heading.eyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{problems.heading.title}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {problems.cards.map((c) => renderCard(c, { tone: "destructive" }))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="border-b border-border bg-muted/20">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl mb-8 md:mb-10">
            <div className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">{solutions.heading.eyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{solutions.heading.title}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{solutions.heading.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {solutions.cards.map((c) => renderCard(c))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-b border-border">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl mb-8 md:mb-10">
            <div className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">{features.heading.eyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{features.heading.title}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.cards.map((c) => renderCard(c))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-b border-border bg-muted/20">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl mb-8 md:mb-10">
            <div className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">{how.heading.eyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{how.heading.title}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {how.cards.map((c, i) => renderCard(c, { index: i }))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="container py-12 md:py-16">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 md:p-12 text-center">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(600px 300px at 50% 0%, hsl(var(--primary) / 0.18), transparent 70%)",
              }}
            />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{cta.title}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{cta.subtitle}</p>
            <div className="mt-8">
              <Button asChild size="lg" className="gap-2">
                <Link to={demoHref}>
                  {cta.button} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Landing;
