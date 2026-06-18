import { ArrowRight, BellRing, Flame, ShieldCheck, UtensilsCrossed, Warehouse } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { AssistantAvatar } from "./AssistantAvatar";

interface Props {
  /** Tap handler — sends the example query through the chat. */
  onAsk: (q: string) => void;
}

/**
 * The assistant's first impression: brand mark + value line + curated capability
 * cards. The FIRST card is a full building scenario that returns a rich
 * evaluation (matched rules + requirements + NFPA refs + CR context + risk), so
 * the very first tap showcases the agent's depth. Cards reveal with a stagger.
 */
export function WelcomeState({ onAsk }: Props) {
  const { tr } = useLang();

  const examples = [
    { icon: UtensilsCrossed, label: tr.demoExLabel1, q: tr.demoEx1 },
    { icon: Warehouse, label: tr.demoExLabel2, q: tr.demoEx2 },
    { icon: BellRing, label: tr.demoExLabel3, q: tr.demoEx3 },
    { icon: ShieldCheck, label: tr.demoExLabel4, q: tr.demoEx4 },
  ];

  return (
    <div className="flex flex-col items-center gap-4 px-1 py-3 text-center duration-500 animate-in fade-in-50">
      <AssistantAvatar className="h-12 w-12 [&>svg]:h-6 [&>svg]:w-6" />

      <div className="space-y-1.5">
        <h3 className="text-balance text-base font-bold leading-snug">{tr.demoWelcomeTitle}</h3>
        <p className="text-pretty text-sm text-muted-foreground">{tr.demoWelcomeSubtitle}</p>
      </div>

      <div className="grid w-full gap-2 sm:grid-cols-2">
        {examples.map((ex, i) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => onAsk(ex.q)}
            style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 p-3 text-left transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-2 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[var(--shadow-glow)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ex.icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium leading-tight">{ex.label}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Flame className="h-3 w-3 text-primary" />
        {tr.capabilities}
      </div>
    </div>
  );
}
