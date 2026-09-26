import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoLimitResponse } from "@/services/fireCodeApi";
import { useLang } from "@/contexts/LangContext";
import { appHref, newTab } from "@/lib/links";

interface Props {
  data: DemoLimitResponse;
}

/**
 * FCR-047: sign-up call-to-action shown when the public demo hits its daily
 * evaluation cap (HTTP 429 from /demo/evaluate). The backend localizes the
 * message + CTA text and supplies the target path, opened on the app in a new tab.
 */
export function DemoLimitCard({ data }: Props) {
  const { lang } = useLang();
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">{data.message}</span>
      </div>
      <Button asChild size="sm" className="mt-1 gap-2">
        <a href={appHref(lang, data.ctaHref || "/login")} {...newTab}>
          <Sparkles className="h-4 w-4" />
          {data.cta}
        </a>
      </Button>
    </div>
  );
}
