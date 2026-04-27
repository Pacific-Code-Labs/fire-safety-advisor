import { AlertTriangle, BookOpen, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import type { EvaluateResponse } from "@/services/fireCodeApi";

interface Props { data: EvaluateResponse; }

export function EvaluationCard({ data }: Props) {
  const { lang, tr } = useLang();
  const hasContent = data.matchedRules?.length > 0 || data.foundryUsed;
  if (!hasContent) return null;

  return (
    <div className="space-y-2">
      {data.foundryUsed && data.reference?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="font-semibold">{tr.refLabel}:</span>
          {data.reference.map((r) => (
            <span key={r} className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">{r}</span>
          ))}
        </div>
      )}

      {data.matchedRules?.length > 0 && (
        <div className="rounded-md border border-border bg-background/40 p-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-accent">
            <MapPin className="h-3.5 w-3.5" /> {tr.crLabel}
          </div>
          <ul className="mt-1.5 space-y-1 text-muted-foreground">
            {data.matchedRules.map((r) => (
              <li key={r.id}>• {r.title} — <span className="opacity-80">{r.description.slice(0, 80)}…</span></li>
            ))}
          </ul>
        </div>
      )}

      {data.foundryUsed && data.requirements?.length > 0 && (
        <div className="rounded-md border border-border bg-background/30 p-2 text-xs">
          <div className="font-semibold text-accent mb-1">{tr.requirements}:</div>
          <ul className="space-y-0.5 text-muted-foreground">
            {data.requirements.map((req, ri) => <li key={ri}>• {req}</li>)}
          </ul>
        </div>
      )}

      {data.foundryUsed && data.contextCr?.length > 0 && (
        <div className="rounded-md border border-border bg-background/20 p-2 text-xs text-muted-foreground">
          <ul className="space-y-0.5">
            {data.contextCr.map((ctx, ci) => <li key={ci}>• {ctx}</li>)}
          </ul>
        </div>
      )}

      {!data.foundryUsed && (
        <p className="text-[11px] italic text-muted-foreground">
          {lang === "es"
            ? "Evaluación IA no disponible — mostrando resultados determinísticos."
            : "AI evaluation unavailable — showing deterministic results."}
        </p>
      )}

      {data.risk === "alto" && (
        <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--risk-high)/0.4)] bg-[hsl(var(--risk-high)/0.1)] p-2 text-xs text-[hsl(var(--risk-high))]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{tr.riskWarning}:</strong>{" "}
            {lang === "es"
              ? "El incumplimiento puede generar paralización de obra y responsabilidad civil."
              : "Non-compliance may cause work shutdown and civil liability."}
          </span>
        </div>
      )}
    </div>
  );
}
