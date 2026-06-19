import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/contexts/LangContext";
import { fireCodeApi, BuildingType, DemoLimitError, QuotaError, type ConversationTurn, type DemoLimitResponse, type EvaluateResponse } from "@/services/fireCodeApi";
import { UpgradeModal } from "@/components/UpgradeModal";
import { localizedPath } from "@/lib/paths";
import type { PageContext } from "@/contexts/AssistantContext";
import {
  normalizeAssistantResponse,
  type AssistantResponseType,
  type ProjectCreatedData,
  type MessageData,
  type NeedsInfoData,
  type ElectricalLoadData,
} from "@/lib/assistantResponse";
import { TextMessage } from "@/components/assistant/TextMessage";
import { EvaluationCard } from "@/components/assistant/EvaluationCard";
import { ProjectCard } from "@/components/assistant/ProjectCard";
import { ElectricalLoadCard } from "@/components/assistant/ElectricalLoadCard";
import { DemoLimitCard } from "@/components/assistant/DemoLimitCard";
import { AssistantMessage } from "@/components/assistant/AssistantMessage";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { WelcomeState } from "@/components/assistant/WelcomeState";
import { TypingIndicator } from "@/components/assistant/TypingIndicator";
import { ChoicePrompt } from "@/components/assistant/ChoicePrompt";
import { NeedsInfoForm } from "@/components/assistant/NeedsInfoForm";
import { type DemoScenario, type DemoScenarioParams } from "@/lib/demoScenarios";
import { cn } from "@/lib/utils";

export type MsgType = "message" | "evaluation" | "project" | "error" | "demo_limit" | "prompt" | "needs_info" | "electrical" | "intake";

/** FCR-100: which guided-demo step a quick-reply prompt drives. */
export type PromptKind = "see_eval" | "create_project" | "create_account";

export interface PromptPayload {
  kind: PromptKind;
  prompt: string;
  options: { label: string; value: string }[];
}

export interface Msg {
  role: "user" | "assistant";
  /** Free-text fallback / summary line */
  text: string;
  /** Discriminator for assistant payload rendering */
  type?: MsgType;
  /** Legacy: full evaluation response (kept for backward compat) */
  answer?: EvaluateResponse;
  /** New polymorphic payload */
  payload?: EvaluateResponse | ProjectCreatedData | MessageData | DemoLimitResponse | PromptPayload | NeedsInfoData | ElectricalLoadData;
}

interface Props {
  buildingType: BuildingType;
  usage: string;
  areaM2?: number;
  floors?: number;
  occupants?: number;
  ceilingHeight?: number;
  volume?: number;
  onClose?: () => void;
  messages: Msg[];
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>;
  /** FCR-042: page/project context forwarded to the agent for continuity. */
  pageContext?: PageContext;
  /**
   * FCR-047: when true this is the PUBLIC demo assistant — calls the throttled
   * public /demo/evaluate (teaser answers, never creates projects) and renders a
   * sign-up CTA on the 429 daily-cap response. FCR-100: it also drives the
   * guided 3-step demo (teaser → full evaluation → project preview → sign-up).
   */
  demo?: boolean;
  /**
   * Demo only: apply a curated scenario's building params to the page's inputs
   * (the BuildingSelector) so a tapped capability card visibly fills the inputs.
   * Provided by the /demo page.
   */
  onApplyScenario?: (params: DemoScenarioParams) => void;
}

/** Cap replayed history to the most recent N turns (FCR-042 token budget). */
const MAX_CONVERSATION_TURNS = 10;

/** Map the running assistant message list to the agent {role,content} contract. */
function toConversation(messages: Msg[]): ConversationTurn[] {
  return messages
    .filter(
      (m) =>
        m.type !== "error" &&
        m.type !== "prompt" &&
        m.type !== "needs_info" &&
        (m.text?.trim()?.length ?? 0) > 0,
    )
    .map<ConversationTurn>((m) => ({ role: m.role, content: m.text }))
    .slice(-MAX_CONVERSATION_TURNS);
}

/** Options passed to ask(). FCR-100 guided-demo controls. */
interface AskOptions {
  /** A tapped scenario's params ground this request immediately (bypasses the setState race). */
  overrides?: DemoScenarioParams;
  /** Teaser step: omit building params so the agent returns a short message, not a full eval. */
  teaser?: boolean;
  /** After a successful (non-needs_info) demo response, show this guided prompt next. */
  demoNext?: PromptKind;
  /**
   * FCR-109: guided-demo step signal sent to the agent (`context.demo_step`) so
   * it returns the right shape per stage: "teaser" → short message + hook;
   * "full_evaluation" → complete evaluation; "project" → create_project preview.
   */
  demoStep?: "teaser" | "full_evaluation" | "project";
}

export function ChatPanel({ buildingType, usage, areaM2, floors, occupants, ceilingHeight, volume, onClose, messages, setMessages, pageContext, demo = false, onApplyScenario }: Props) {
  const { lang, tr } = useLang();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // FCR-026: the authenticated /evaluate quota gate returns 402/429 → QuotaError.
  // The public demo path keeps using DemoLimitError; this is the signed-in path.
  const [quota, setQuota] = useState<QuotaError | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // FCR-100 guided-demo state (refs avoid re-render churn / setState races).
  const demoNextRef = useRef<PromptKind | null>(null);
  const activeScenarioRef = useRef<DemoScenario | null>(null);
  const activeQueryRef = useRef<string>("");
  const demoEndedRef = useRef<boolean>(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  /** Render the agent response and return its normalized type (for guided flow). */
  const handleResponse = (raw: unknown): AssistantResponseType => {
    const norm = normalizeAssistantResponse(raw);

    switch (norm.type) {
      case "evaluation": {
        const data = norm.data;
        let summary: string;
        if (data.matchedRules.length > 0) {
          summary =
            lang === "es"
              ? `Encontré ${data.matchedRules.length} norma(s) aplicable(s).`
              : `Found ${data.matchedRules.length} applicable standard(s).`;
        } else if (data.foundryUsed && data.requirements.length > 0) {
          // No deterministic rule match, but the agent returned requirements —
          // lead with the first one (truncated) instead of a generic sentence.
          const lead = data.requirements[0].trim();
          const clipped = lead.length > 140 ? `${lead.slice(0, 140).trimEnd()}…` : lead;
          summary = lang === "es" ? `Requisito clave: ${clipped}` : `Key requirement: ${clipped}`;
        } else {
          summary =
            lang === "es"
              ? "No encontré normas específicas para esa consulta."
              : "No specific standards found for that query.";
        }

        setMessages((m) => [
          ...m,
          { role: "assistant", text: summary, type: "evaluation", payload: data, answer: data },
        ]);
        break;
      }
      case "message": {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: norm.data.message, type: "message", payload: norm.data },
        ]);
        break;
      }
      case "project_created": {
        const name = norm.data.project?.name || (lang === "es" ? "Proyecto" : "Project");
        const isPreview = norm.data.projectId == null;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: isPreview
              ? lang === "es" ? `Vista previa de "${name}".` : `Preview of "${name}".`
              : lang === "es" ? `Proyecto "${name}" creado.` : `Project "${name}" created.`,
            type: "project",
            payload: norm.data,
          },
        ]);
        if (!isPreview) toast.success(lang === "es" ? "Proyecto creado" : "Project created successfully");
        break;
      }
      case "needs_info": {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "", type: "needs_info", payload: norm.data },
        ]);
        break;
      }
      case "electrical_load": {
        const summary =
          lang === "es"
            ? `Estudio de carga preliminar: ${norm.data.demandKva?.toLocaleString?.() ?? norm.data.demandKva} kVA demandados.`
            : `Preliminary load study: ${norm.data.demandKva?.toLocaleString?.() ?? norm.data.demandKva} kVA demanded.`;
        setMessages((m) => [
          ...m,
          { role: "assistant", text: summary, type: "electrical", payload: norm.data },
        ]);
        break;
      }
    }
    return norm.type;
  };

  const handleDemoLimit = (payload: DemoLimitResponse) => {
    setMessages((m) => [
      ...m,
      { role: "assistant", text: payload.message, type: "demo_limit", payload },
    ]);
  };

  const handleError = (err?: unknown) => {
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        type: "error",
        text: lang === "es"
          ? "Error al procesar la consulta. Verifique su conexión."
          : "Error processing the request. Please check your connection.",
      },
    ]);
    if (err) console.error("Assistant error:", err);
  };

  /** Append a guided-demo quick-reply prompt for the given step (FCR-100). */
  const appendPrompt = (kind: PromptKind) => {
    const byKind: Record<PromptKind, PromptPayload> = {
      see_eval: {
        kind,
        prompt: tr.demoStep2Q,
        options: [
          { label: tr.demoSeeEval, value: "yes" },
          { label: tr.demoNo, value: "no" },
        ],
      },
      create_project: {
        kind,
        prompt: tr.demoStep3Q,
        options: [
          { label: tr.demoYes, value: "yes" },
          { label: tr.demoNo, value: "no" },
        ],
      },
      create_account: {
        kind,
        prompt: tr.demoAccountQ,
        options: [
          { label: tr.demoCreateAccount, value: "yes" },
          { label: tr.demoNotNow, value: "no" },
        ],
      },
    };
    const payload = byKind[kind];
    setMessages((m) => [...m, { role: "assistant", text: payload.prompt, type: "prompt", payload }]);
  };

  /** Soft-end: invite to sign up, keep the chat open. */
  const appendInvite = () => {
    demoEndedRef.current = true;
    setMessages((m) => [
      ...m,
      { role: "assistant", text: tr.demoInvite, type: "message", payload: { message: tr.demoInvite } },
    ]);
  };

  /**
   * Send a query. `opts.overrides` ground the building params for THIS request
   * (bypassing the setState race); `opts.teaser` omits building params so the
   * demo's step-1 answer is a short teaser; `opts.demoNext` is the guided prompt
   * to append after a successful (non-needs_info) demo response.
   */
  const ask = async (text: string, opts: AskOptions = {}) => {
    if (!text.trim() || isLoading) return;
    const { overrides, teaser, demoNext, demoStep } = opts;
    if (demoNext !== undefined) demoNextRef.current = demoNext;

    // Prior turns BEFORE appending the current question (FCR-042). The current
    // query is sent separately as user_query, so it is excluded here.
    const conversation = toConversation(messages);
    setMessages((m) => [...m, { role: "user", text, type: "message" }]);
    setInput("");
    setIsLoading(true);

    // The public demo sends context.page="demo" and hits the throttled public
    // /demo/evaluate; the dashboard assistant uses the authenticated /evaluate.
    // FCR-044: send REAL selected values (or omit). A tapped scenario's overrides
    // win; a teaser step omits building params so the agent gives a short answer.
    const requestBody = {
      building_type: teaser ? undefined : (overrides?.building_type ?? buildingType ?? undefined),
      usage: teaser ? undefined : (overrides?.usage ?? usage ?? undefined),
      user_query: text,
      area_m2: teaser ? undefined : (overrides?.area_m2 ?? areaM2 ?? undefined),
      floors: teaser ? undefined : (overrides?.floors ?? floors ?? undefined),
      occupants: teaser ? undefined : (overrides?.occupants ?? occupants ?? undefined),
      ceiling_height_m: teaser ? undefined : (overrides?.ceiling_height_m ?? ceilingHeight ?? undefined),
      volume_m3: teaser ? undefined : (overrides?.volume_m3 ?? volume ?? undefined),
      language: lang,
      conversation,
      context: demo
        ? { page: "demo" as const, project: null, demo_step: demoStep }
        : pageContext
        ? { page: pageContext.page, project: pageContext.payload ?? null }
        : undefined,
    };

    try {
      const result = demo
        ? await fireCodeApi.evaluateDemo(requestBody)
        : await fireCodeApi.evaluate(requestBody);
      const type = handleResponse(result);
      // Guided demo: advance to the next prompt. On needs_info the form drives
      // the resend (which carries demoNext forward), so don't prompt yet.
      if (demo && !demoEndedRef.current && type !== "needs_info" && demoNextRef.current) {
        const next = demoNextRef.current;
        demoNextRef.current = null;
        appendPrompt(next);
      }
    } catch (err) {
      if (err instanceof DemoLimitError) {
        handleDemoLimit(err.payload);
      } else if (err instanceof QuotaError) {
        setQuota(err);
      } else {
        handleError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Start guided-demo step 1 (teaser). */
  const startDemoStep1 = (scenario: DemoScenario | null, query: string) => {
    demoEndedRef.current = false;
    activeScenarioRef.current = scenario;
    activeQueryRef.current = query;
    ask(query, { teaser: true, demoNext: "see_eval", demoStep: "teaser" });
  };

  /** A tapped capability card. Demo → guided step 1; dashboard → grounded eval. */
  const handlePick = (s: DemoScenario) => {
    onApplyScenario?.(s.params);
    if (demo) startDemoStep1(s, s.query);
    else ask(s.query, { overrides: s.params });
  };

  /** The text input submit. Demo → guided step 1; dashboard → normal eval. */
  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    if (demo) startDemoStep1(null, text);
    else ask(text);
  };

  /** A guided-demo quick-reply choice (FCR-100). */
  const handleChoice = (kind: PromptKind, value: string) => {
    if (isLoading) return;
    if (value === "no") {
      appendInvite();
      return;
    }
    switch (kind) {
      case "see_eval":
        // Send a clean affirmative as the visible message (NOT a replay of the
        // original building query); the scenario params ground it and the prior
        // turns carry the case, so the agent returns the full evaluation.
        ask(tr.demoSeeEvalMsg, {
          overrides: activeScenarioRef.current?.params,
          demoNext: "create_project",
          demoStep: "full_evaluation",
        });
        break;
      case "create_project":
        // Step 3: collect a few interactive project details first (name/focus),
        // then build the create_project message from the answers.
        appendIntake();
        break;
      case "create_account":
        navigate(localizedPath(lang, "/register"));
        break;
    }
  };

  /** Step-3 interactive project intake (FCR-114) — a client-driven needs_info. */
  const appendIntake = () => {
    const focusOptions = tr.demoIntakeFocusOptions.split("|").map((s) => s.trim()).filter(Boolean);
    const data: NeedsInfoData = {
      questions: [
        { key: "name", label: tr.demoIntakeNameLabel, type: "text", required: true, hint: tr.demoIntakeNameHint },
        { key: "focus", label: tr.demoIntakeFocusLabel, type: "multi_select", required: false, options: focusOptions },
        { key: "notes", label: tr.demoIntakeNotesLabel, type: "text", required: false },
      ],
      context: {},
    };
    setMessages((m) => [...m, { role: "assistant", text: tr.demoIntakeTitle, type: "intake", payload: data }]);
  };

  /** Build the create_project message from the intake answers and send it. */
  const handleIntakeSubmit = (summary: string) => {
    ask(`${tr.demoCreateProjectMsg} ${summary}`, {
      overrides: activeScenarioRef.current?.params,
      demoNext: "create_account",
      demoStep: "project",
    });
  };

  /** Resend after the user answers the agent's clarifying questions (FCR-101). */
  const handleNeedsInfoSubmit = (summary: string) => {
    ask(summary, { overrides: activeScenarioRef.current?.params });
  };

  const renderAssistantBody = (m: Msg) => {
    // Resolve effective type with backward compatibility
    const type: MsgType = m.type ?? (m.answer ? "evaluation" : "message");

    if (type === "evaluation") {
      const data = (m.payload as EvaluateResponse | undefined) ?? m.answer;
      return (
        <>
          <TextMessage text={m.text} />
          {data && <div className="mt-3"><EvaluationCard data={data} /></div>}
        </>
      );
    }
    if (type === "project") {
      return (
        <>
          <TextMessage text={m.text} />
          {m.payload && <div className="mt-3"><ProjectCard data={m.payload as ProjectCreatedData} /></div>}
        </>
      );
    }
    if (type === "electrical") {
      return (
        <>
          <TextMessage text={m.text} />
          {m.payload && (
            <div className="mt-3">
              <ElectricalLoadCard data={m.payload as ElectricalLoadData} />
            </div>
          )}
        </>
      );
    }
    if (type === "demo_limit" && m.payload) {
      return <DemoLimitCard data={m.payload as DemoLimitResponse} />;
    }
    if (type === "prompt" && m.payload) {
      const p = m.payload as PromptPayload;
      return <ChoicePrompt prompt={p.prompt} options={p.options} onChoose={(v) => handleChoice(p.kind, v)} />;
    }
    if (type === "needs_info" && m.payload) {
      return <NeedsInfoForm data={m.payload as NeedsInfoData} onSubmit={handleNeedsInfoSubmit} />;
    }
    if (type === "intake" && m.payload) {
      return (
        <NeedsInfoForm
          data={m.payload as NeedsInfoData}
          onSubmit={handleIntakeSubmit}
          title={tr.demoIntakeTitle}
          submitLabel={tr.demoIntakeSubmit}
        />
      );
    }
    if (type === "message") {
      // FCR-114: in the guided demo the quick-reply prompts (and the step-3
      // create_account prompt) drive sign-up — so the per-message CTA is
      // suppressed (no early invite). The dashboard assistant never sets `demo`.
      return <AssistantMessage text={m.text} demo={false} onPick={handlePick} />;
    }
    // error / fallback
    return <TextMessage text={m.text} />;
  };

  return (
    <div className="panel flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{tr.assistant}</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title={lang === "es" ? "Limpiar chat" : "Clear chat"}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title={lang === "es" ? "Cerrar" : "Close"}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && <WelcomeState onPick={handlePick} />}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 duration-300 animate-in fade-in-50 slide-in-from-bottom-1",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "assistant" && <AssistantAvatar />}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground shadow-sm"
                  : m.type === "error"
                  ? "rounded-bl-sm border border-destructive/40 bg-destructive/10 text-destructive"
                  : "rounded-bl-sm border border-border bg-secondary/60",
              )}
            >
              {m.role === "user" ? <TextMessage text={m.text} /> : renderAssistantBody(m)}
            </div>
          </div>
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={tr.askPlaceholder}
          className="bg-input/60"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      <UpgradeModal quota={quota} onClose={() => setQuota(null)} />
    </div>
  );
}
