import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/contexts/LangContext";
import type { NeedsInfoData } from "@/lib/assistantResponse";

interface Props {
  data: NeedsInfoData;
  onSubmit: (summary: string) => void;
}

/**
 * FCR-101: renders the agent's structured clarifying questions as a small form.
 * On submit it builds a localized answer summary and hands it back to ChatPanel,
 * which resends it so the agent now has the missing context.
 */
export function NeedsInfoForm({ data, onSubmit }: Props) {
  const { tr } = useLang();
  const questions = data.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  const submit = () => {
    const filled = questions
      .map((q) => {
        const v = (answers[q.key] ?? "").trim();
        return v ? `${q.label} ${v}` : null;
      })
      .filter((x): x is string => x !== null);
    if (filled.length === 0) return;
    setSubmitted(true);
    onSubmit(filled.join("; "));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{tr.needsInfoTitle}</p>
      <div className="space-y-2">
        {questions.map((q) => (
          <div key={q.key} className="space-y-1">
            <label className="block text-xs text-muted-foreground">{q.label}</label>
            {q.options && q.options.length > 0 ? (
              <select
                className="w-full rounded-md border border-border bg-input/60 px-2 py-1.5 text-sm"
                value={answers[q.key] ?? ""}
                disabled={submitted}
                onChange={(e) => set(q.key, e.target.value)}
              >
                <option value="">—</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <Input
                type={q.type === "number" ? "number" : "text"}
                value={answers[q.key] ?? ""}
                placeholder={q.hint ?? ""}
                disabled={submitted}
                onChange={(e) => set(q.key, e.target.value)}
                className="bg-input/60"
              />
            )}
          </div>
        ))}
      </div>
      <Button size="sm" disabled={submitted} onClick={submit}>
        {tr.needsInfoSubmit}
      </Button>
    </div>
  );
}
