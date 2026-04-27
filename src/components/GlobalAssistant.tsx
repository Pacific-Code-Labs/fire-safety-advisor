import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/ChatPanel";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLang } from "@/contexts/LangContext";
import { BuildingType } from "@/services/fireCodeApi";
import { cn } from "@/lib/utils";

export function GlobalAssistant() {
  const { open, setOpen, messages, setMessages, input, pageContext } = useAssistant();
  const { lang, tr } = useLang();

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (open && window.matchMedia("(max-width: 1023px)").matches) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  return (
    <>
      {/* Floating action button (hidden when open) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={tr.assistant}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold hidden sm:inline">{tr.assistant}</span>
        </button>
      )}

      {/* Slide-over panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden border border-border bg-background shadow-2xl",
              // Mobile: bottom sheet-ish full panel
              "inset-x-3 bottom-3 top-16 rounded-xl",
              // Desktop: right side panel
              "lg:inset-auto lg:right-4 lg:bottom-4 lg:top-20 lg:w-[400px] lg:rounded-xl"
            )}
          >
            {/* Tiny meta bar showing page context */}
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span className="truncate">
                {lang === "es" ? "Contexto" : "Context"}: <span className="font-mono">{pageContext.page}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 lg:hidden"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0">
              <ChatPanel
                buildingType={input.buildingType ?? BuildingType.comercial}
                usage={input.usage ?? ""}
                areaM2={input.areaM2}
                floors={input.floors}
                occupants={input.occupants}
                ceilingHeight={input.ceilingHeight}
                volume={input.volume}
                onClose={() => setOpen(false)}
                messages={messages}
                setMessages={setMessages}
              />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
