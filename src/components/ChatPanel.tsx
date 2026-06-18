import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/contexts/LangContext";
import { fireCodeApi, BuildingType, DemoLimitError, QuotaError, type ConversationTurn, type DemoLimitResponse, type EvaluateResponse } from "@/services/fireCodeApi";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { PageContext } from "@/contexts/AssistantContext";
import {
  normalizeAssistantResponse,
  type ProjectCreatedData,
  type MessageData,
} from "@/lib/assistantResponse";
import { TextMessage } from "@/components/assistant/TextMessage";
import { EvaluationCard } from "@/components/assistant/EvaluationCard";
import { ProjectCard } from "@/components/assistant/ProjectCard";
import { DemoLimitCard } from "@/components/assistant/DemoLimitCard";
import { AssistantMessage } from "@/components/assistant/AssistantMessage";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { WelcomeState } from "@/components/assistant/WelcomeState";
import { TypingIndicator } from "@/components/assistant/TypingIndicator";
import { cn } from "@/lib/utils";

export type MsgType = "message" | "evaluation" | "project" | "error" | "demo_limit";

export interface Msg {
  role: "user" | "assistant";
  /** Free-text fallback / summary line */
  text: string;
  /** Discriminator for assistant payload rendering */
  type?: MsgType;
  /** Legacy: full evaluation response (kept for backward compat) */
  answer?: EvaluateResponse;
  /** New polymorphic payload */
  payload?: EvaluateResponse | ProjectCreatedData | MessageData | DemoLimitResponse;
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
   * sign-up CTA on the 429 daily-cap response.
   */
  demo?: boolean;
}

/** Cap replayed history to the most recent N turns (FCR-042 token budget). */
const MAX_CONVERSATION_TURNS = 10;

/** Map the running assistant message list to the agent {role,content} contract. */
function toConversation(messages: Msg[]): ConversationTurn[] {
  return messages
    .filter((m) => m.type !== "error" && (m.text?.trim()?.length ?? 0) > 0)
    .map<ConversationTurn>((m) => ({ role: m.role, content: m.text }))
    .slice(-MAX_CONVERSATION_TURNS);
}

export function ChatPanel({ buildingType, usage, areaM2, floors, occupants, ceilingHeight, volume, onClose, messages, setMessages, pageContext, demo = false }: Props) {
  const { lang, tr } = useLang();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // FCR-026: the authenticated /evaluate quota gate returns 402/429 → QuotaError.
  // The public demo path keeps using DemoLimitError; this is the signed-in path.
  const [quota, setQuota] = useState<QuotaError | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleResponse = (raw: unknown) => {
    const norm = normalizeAssistantResponse(raw);

    switch (norm.type) {
      case "evaluation": {
        const data = norm.data;
        const summary = data.matchedRules.length > 0
          ? lang === "es"
            ? `Encontré ${data.matchedRules.length} norma(s) aplicable(s).`
            : `Found ${data.matchedRules.length} applicable standard(s).`
          : data.foundryUsed && data.requirements.length > 0
          ? lang === "es"
            ? "El agente IA proporcionó recomendaciones generales."
            : "The AI agent provided general recommendations."
          : lang === "es"
          ? "No encontré normas específicas para esa consulta."
          : "No specific standards found for that query.";

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
        const name = norm.data.name || (lang === "es" ? "Proyecto" : "Project");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: lang === "es" ? `Proyecto "${name}" creado.` : `Project "${name}" created.`,
            type: "project",
            payload: norm.data,
          },
        ]);
        toast.success(lang === "es" ? "Proyecto creado" : "Project created successfully");
        break;
      }
    }
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

  const ask = async (text: string) => {
    if (!text.trim() || isLoading) return;
    // Prior turns BEFORE appending the current question (FCR-042). The current
    // query is sent separately as user_query, so it is excluded here.
    const conversation = toConversation(messages);
    setMessages((m) => [...m, { role: "user", text, type: "message" }]);
    setInput("");
    setIsLoading(true);

    // FCR-047: the public demo sends demo=true + context.page="demo" and hits
    // the throttled public /demo/evaluate; the dashboard assistant uses the
    // authenticated /evaluate.
    const requestBody = {
      // FCR-044: send the REAL selected values (or omit). No fabricated
      // "comercial"/usage-from-query defaults — the agent infers or asks.
      building_type: buildingType || undefined,
      usage: usage || undefined,
      user_query: text,
      area_m2: areaM2 || undefined,
      floors: floors || undefined,
      occupants: occupants || undefined,
      ceiling_height_m: ceilingHeight || undefined,
      volume_m3: volume || undefined,
      language: lang,
      conversation,
      context: demo
        ? { page: "demo" as const, project: null }
        : pageContext
        ? { page: pageContext.page, project: pageContext.payload ?? null }
        : undefined,
      demo: demo || undefined,
    };

    try {
      const result = demo
        ? await fireCodeApi.evaluateDemo(requestBody)
        : await fireCodeApi.evaluate(requestBody);
      handleResponse(result);
    } catch (err) {
      if (err instanceof DemoLimitError) {
        handleDemoLimit(err.payload);
      } else if (err instanceof QuotaError) {
        // Signed-in evaluate quota reached — open the UpgradeModal (FCR-026)
        // instead of pushing a generic error bubble.
        setQuota(err);
      } else {
        handleError(err);
      }
    } finally {
      setIsLoading(false);
    }
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
    if (type === "demo_limit" && m.payload) {
      return <DemoLimitCard data={m.payload as DemoLimitResponse} />;
    }
    if (type === "message") {
      return <AssistantMessage text={m.text} demo={demo} onAsk={ask} />;
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
        {messages.length === 0 && <WelcomeState onAsk={ask} />}

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
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
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
