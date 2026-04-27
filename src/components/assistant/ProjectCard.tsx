import { FolderPlus } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import type { ProjectCreatedData } from "@/lib/assistantResponse";

interface Props { data: ProjectCreatedData; }

export function ProjectCard({ data }: Props) {
  const { lang } = useLang();
  const reqs = data.keyRequirements ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent">
        <FolderPlus className="h-4 w-4" />
        {lang === "es" ? "Proyecto creado" : "Project created"}
      </div>
      <div className="rounded-md border border-border bg-background/40 p-2 text-xs space-y-1">
        <div><span className="font-semibold">{lang === "es" ? "Nombre" : "Name"}:</span> {data.name}</div>
        {data.usage && (
          <div><span className="font-semibold">{lang === "es" ? "Uso" : "Usage"}:</span> {data.usage}</div>
        )}
        {data.buildingType && (
          <div><span className="font-semibold">{lang === "es" ? "Tipo" : "Type"}:</span> {data.buildingType}</div>
        )}
        {reqs.length > 0 && (
          <div className="pt-1">
            <div className="font-semibold mb-1">{lang === "es" ? "Requisitos clave" : "Key requirements"}:</div>
            <ul className="space-y-0.5 text-muted-foreground">
              {reqs.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
