import { FolderPlus } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import type { ProjectCreatedData } from "@/lib/assistantResponse";

interface Props { data: ProjectCreatedData; }

export function ProjectCard({ data }: Props) {
  const { lang, tr } = useLang();
  const project = data.project ?? ({ name: "" } as ProjectCreatedData["project"]);
  const reqs = project.requirements ?? [];
  // FCR-100: projectId === null/undefined ⇒ non-persisted demo PREVIEW.
  const isPreview = data.projectId == null;
  const name = project.name || (lang === "es" ? "Proyecto" : "Project");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent">
        <FolderPlus className="h-4 w-4" />
        {isPreview
          ? lang === "es" ? "Vista previa del proyecto" : "Project preview"
          : lang === "es" ? "Proyecto creado" : "Project created"}
      </div>
      <div className="rounded-md border border-border bg-background/40 p-2 text-xs space-y-1">
        <div><span className="font-semibold">{lang === "es" ? "Nombre" : "Name"}:</span> {name}</div>
        {project.usage && (
          <div><span className="font-semibold">{lang === "es" ? "Uso" : "Usage"}:</span> {project.usage}</div>
        )}
        {project.buildingType && (
          <div><span className="font-semibold">{lang === "es" ? "Tipo" : "Type"}:</span> {project.buildingType}</div>
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
      {isPreview && (
        <p className="text-[11px] italic text-muted-foreground">{tr.demoPreviewNote}</p>
      )}
    </div>
  );
}
