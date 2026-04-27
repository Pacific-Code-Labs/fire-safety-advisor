/**
 * Normalizer for the polymorphic assistant response.
 *
 * Backend may return:
 *   { type: "evaluation"   | "message" | "project_created", data: {...} }
 *
 * For backward compatibility, a raw EvaluateResponse (no `type`) is treated
 * as { type: "evaluation", data: <response> }.
 */

import type { EvaluateResponse } from "@/services/fireCodeApi";

export type AssistantResponseType = "evaluation" | "message" | "project_created";

export interface ProjectCreatedData {
  id?: string;
  name: string;
  usage?: string;
  buildingType?: string;
  keyRequirements?: string[];
  [k: string]: unknown;
}

export interface MessageData {
  message: string;
}

export type NormalizedResponse =
  | { type: "evaluation"; data: EvaluateResponse }
  | { type: "message"; data: MessageData }
  | { type: "project_created"; data: ProjectCreatedData };

function looksLikeEvaluation(obj: unknown): obj is EvaluateResponse {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    "matchedRules" in o ||
    "requirements" in o ||
    "reference" in o ||
    "contextCr" in o ||
    "risk" in o
  );
}

export function normalizeAssistantResponse(raw: unknown): NormalizedResponse {
  if (raw && typeof raw === "object" && "type" in (raw as object)) {
    const { type, data } = raw as { type: AssistantResponseType; data: unknown };
    switch (type) {
      case "message":
        return { type: "message", data: (data as MessageData) ?? { message: "" } };
      case "project_created":
        return { type: "project_created", data: (data as ProjectCreatedData) ?? { name: "" } };
      case "evaluation":
        return { type: "evaluation", data: data as EvaluateResponse };
      default:
        // Unknown — fall through to evaluation guess
        break;
    }
  }
  // Backward compat: treat as evaluation
  if (looksLikeEvaluation(raw)) {
    return { type: "evaluation", data: raw };
  }
  // Last resort: stringify into a plain message
  return {
    type: "message",
    data: { message: typeof raw === "string" ? raw : JSON.stringify(raw) },
  };
}
