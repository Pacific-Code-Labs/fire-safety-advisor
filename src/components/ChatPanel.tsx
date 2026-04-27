import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/contexts/LangContext";
import { fireCodeApi, BuildingType, type EvaluateResponse } from "@/services/fireCodeApi";
import {
  normalizeAssistantResponse,
  type ProjectCreatedData,
  type MessageData,
} from "@/lib/assistantResponse";
import { TextMessage } from "@/components/assistant/TextMessage";
import { EvaluationCard } from "@/components/assistant/EvaluationCard";
import { ProjectCard } from "@/components/assistant/ProjectCard";
import { cn } from "@/lib/utils";

export type MsgType = "message" | "evaluation" | "project" | "error";

export interface Msg {
  role: "user" | "assistant";
  /** Free-text fallback / summary line */
  text: string;
  /** Discriminator for assistant payload rendering */
  type?: MsgType;
  /** Legacy: full evaluation response (kept for backward compat) */
  answer?: EvaluateResponse;
  /** New polymorphic payload */
  payload?: EvaluateResponse | ProjectCreatedData | MessageData;
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
}

export function ChatPanel({ buildingType, usage, areaM2, floors, occupants, ceilingHeight, volume, onClose, messages, setMessages }: Props) {
  const { lang, tr } = useLang();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestions = lang === "es"
    ? ["¿Qué sistema necesita un restaurante?", "¿Dónde instalo detectores de humo?", "¿Necesito rociadores en una bodega?"]
    : ["What system does a restaurant need?", "Where do I install smoke detectors?", "Do I need sprinklers in a warehouse?"];

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
    setMessages((m) => [...m, { role: "user", text, type: "message" }]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await fireCodeApi.evaluate({
        building_type: buildingType || BuildingType.comercial,
        usage: usage || text,
        user_query: text,
        area_m2: areaM2 || undefined,
        floors: floors || undefined,
        occupants: occupants || undefined,
        ceiling_height_m: ceilingHeight || undefined,
        volume_m3: volume || undefined,
      });
      handleResponse(result);
    } catch (err) {
      handleError(err);
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
    // message / error / fallback
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
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{tr.chatIntro}</p>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr.suggestions}</div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="block w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-xs hover:border-primary/40 hover:bg-primary/5 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.type === "error"
                  ? "border border-destructive/40 bg-destructive/10 text-destructive"
                  : "bg-secondary/60 border border-border"
              )}
            >
              {m.role === "user" ? <TextMessage text={m.text} /> : renderAssistantBody(m)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary/60 border border-border px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
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
    </div>
  );
}
