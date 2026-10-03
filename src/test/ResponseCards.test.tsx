import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "@/lib/i18n";
import { EvaluationCard } from "@/components/assistant/EvaluationCard";
import { ProjectCard } from "@/components/assistant/ProjectCard";
import type { EvaluateResponse } from "@/services/sokolApi";

vi.mock("@/contexts/LangContext", () => ({ useLang: () => ({ lang: "en", tr: t.en }) }));
afterEach(cleanup);

const description = "A complete standard description that exceeds eighty characters and includes critical guidance at its very end.";
const requirements = ["First requirement", "Final requirement including all agent details"];
const context = { topic: "Authority review", detail: "Full local guidance", authority: "AHJ", reference: "Local code" };

describe("assistant response cards", () => {
  it("renders complete evaluation descriptions, requirements, context, references and medium risk", () => {
    render(<EvaluationCard data={{
      matchedRules: [{ id: "rule", title: "Standard", description }],
      foundryUsed: true, requirements, contextCr: [context], reference: ["NFPA 101"], risk: "medio",
    } as EvaluateResponse} />);
    expect(screen.getByText(description)).toBeInTheDocument();
    for (const requirement of requirements) expect(screen.getByText(requirement)).toBeInTheDocument();
    expect(screen.getByText(/Full local guidance/)).toBeInTheDocument();
    expect(screen.getByText(/AHJ · Local code/)).toBeInTheDocument();
    expect(screen.getByText("NFPA 101")).toBeInTheDocument();
    expect(screen.getByText("Medium risk")).toBeInTheDocument();
  });

  it("renders preview contents and low risk without exposing backend identifiers", () => {
    render(<ProjectCard data={{ projectId: null, project: {
      name: "Office preview", usage: "office", areaM2: 100, floors: 1, occupants: 10,
      requirements, contextCr: [context], reference: ["NFPA 10"], risk: "bajo",
    } }} />);
    expect(screen.getByText("Office preview")).toBeInTheDocument();
    for (const requirement of requirements) expect(screen.getByText(requirement)).toBeInTheDocument();
    expect(screen.getByText(/Full local guidance/)).toBeInTheDocument();
    expect(screen.getByText("NFPA 10")).toBeInTheDocument();
    expect(screen.getByText("Low risk")).toBeInTheDocument();
    expect(screen.queryByText(/projectId|foundryUsed/)).not.toBeInTheDocument();
  });
});
