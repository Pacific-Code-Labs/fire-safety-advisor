/**
 * Pricing (FCR-028, public, card-free) — the 3-tier plan surface.
 *
 * Renders Free / Pro / Enterprise cards from the FE plan mirror (`lib/plans.ts`,
 * synced with BE `config/plans.py`). The landing has no session: the Free CTA
 * opens registration in the app (new tab); the app's own /pricing shows the
 * user's current plan. Pro + Enterprise are marked "Coming soon"
 * (NO checkout, NO PayPal, NO card fields). Bilingual via LangContext; DS
 * primitives (Card/Badge/Button) from `@pacific-code-labs/sokol-design-system`.
 */
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pacific-code-labs/sokol-design-system";
import { Check } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { PLAN_ORDER, PLANS, type PlanConfig, type PlanTier } from "@/lib/plans";
import type { Dict } from "@/lib/i18n";
import { appHref, newTab } from "@/lib/links";

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const NAME_KEY: Record<PlanTier, keyof Dict> = {
  free: "plan_free_name",
  pro: "plan_pro_name",
  enterprise: "plan_enterprise_name",
};
const TAGLINE_KEY: Record<PlanTier, keyof Dict> = {
  free: "plan_free_tagline",
  pro: "plan_pro_tagline",
  enterprise: "plan_enterprise_tagline",
};

function quotaLabel(value: number | null, tr: Dict): string {
  return value === null ? tr.pricing_unlimited : String(value);
}

function seatsLabel(seats: number, tr: Dict): string {
  return fill(seats === 1 ? tr.pricing_seats_one : tr.pricing_seats_many, { count: seats });
}

function planFeatures(plan: PlanConfig, tr: Dict): string[] {
  return [
    fill(tr.pricing_feat_evals, { value: quotaLabel(plan.monthlyEvaluateQuota, tr) }),
    fill(tr.pricing_feat_projects, { value: quotaLabel(plan.maxSavedProjects, tr) }),
    seatsLabel(plan.seats, tr),
  ];
}

export default function Pricing() {
  const { lang, tr } = useLang();

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <main className="container py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight">{tr.pricing_title}</h1>
          <p className="mt-2 text-muted-foreground">{tr.pricing_subtitle}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((t) => {
            const plan = PLANS[t];
            const comingSoon = !plan.selfServe;
            return (
              <Card
                key={t}
                className="flex flex-col"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{tr[NAME_KEY[t]]}</CardTitle>
                    {comingSoon && <Badge variant="info">{tr.pricing_coming_soon}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{tr[TAGLINE_KEY[t]]}</p>
                </CardHeader>

                <CardBody className="flex-1">
                  <ul className="space-y-2 text-sm">
                    {planFeatures(plan, tr).map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>

                <CardFooter>
                  {t === "free" ? (
                    <a href={appHref(lang, "/register")} {...newTab} className={`${buttonVariants()} w-full`}>
                      {tr.pricing_free_cta_anon}
                    </a>
                  ) : (
                    // Pro / Enterprise — NO checkout / PayPal yet (FCR-027 deferred).
                    <Button variant="outline" disabled className="w-full">
                      {tr.pricing_coming_soon}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

      </main>
    </div>
  );
}
