import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoLimitResponse } from "@/services/fireCodeApi";

interface Props {
  data: DemoLimitResponse;
}

/**
 * FCR-047: sign-up call-to-action shown when the public demo hits its daily
 * evaluation cap (HTTP 429 from /demo/evaluate). The backend localizes the
 * message + CTA text and supplies the target href.
 */
export function DemoLimitCard({ data }: Props) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">{data.message}</span>
      </div>
      <Button asChild size="sm" className="mt-1 gap-2">
        <Link to={data.ctaHref || "/login"}>
          <Sparkles className="h-4 w-4" />
          {data.cta}
        </Link>
      </Button>
    </div>
  );
}
