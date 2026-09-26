/**
 * FireCode CR — public demo API (landing).
 *
 * The landing has no sign-in and no app API: the demo calls the api-be routes that the PUBLIC
 * gateway (public-api.fire-code.jcampos.dev) exposes to identity-pool guests — GET /rules,
 * GET /rules/{id}, POST /demo/evaluate, POST /demo/electrical — SigV4-signed by the design
 * system. api-be caps demo evaluations per visitor.
 *
 * Usage:
 *   const groups = await fireCodeApi.getRules({ building_type: "comercial" });
 */

import { signedPublicRequest } from "@pacific-code-labs/fire-code-design-system";
import { PUBLIC_API } from "@/config/publicApi";

// ── DTOs matching the backend contract ───────────────────────────────────────

export interface RiskDTO {
  level: string;
  impact: string;
  consequence: string;
}

export interface RuleDTO {
  id: string;
  standard: string;
  title: string;
  category: string;
  description: string;
  risk: RiskDTO;
  technical_requirements: string[];
  installation_requirements: string[];
  inspection_requirements: string[];
  failure_risks: string[];
  applies_to: string[];
  conditions: string[];
  keywords: string[];
}

export interface RuleGroupDTO {
  type: string;
  description: string;
  quantity: number;
  rules: RuleDTO[];
}

export enum BuildingType {
  residencial = 1,
  comercial   = 2,
  industrial  = 3,
}

export enum RuleCategory {
  iniciacion    = 1,
  notificacion  = 2,
  monitoreo     = 3,
  accionamiento = 4,
}

export interface PaginationResponse {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface RuleListResponse {
  data: RuleGroupDTO[];
  pagination: PaginationResponse;
}

export type Language = "es" | "en";

export interface GetRulesParams {
  building_type?: BuildingType;
  category?: RuleCategory;
  usage?: string;
  area_m2?: number;
  floors?: number;
  occupants?: number;
  ceiling_height_m?: number;
  volume_m3?: number;
  standard?: string;
  page?: number;
  page_size?: number;
  /** Dataset + label language (es | en). Defaults to "es" on the backend. */
  language?: Language;
}

/** A single prior conversation turn replayed to the agent (FCR-042). */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** Where the user is in the app when asking (FCR-042). The public demo uses "demo". */
export interface EvaluateContext {
  page: "dashboard" | "projects" | "project_detail" | "evaluation" | "demo" | "other";
  project?: Record<string, unknown> | null;
  /** FCR-109: guided-demo step (DEMO MODE only) — teaser | full_evaluation | project. */
  demo_step?: "teaser" | "full_evaluation" | "project";
}

export interface EvaluateRequest {
  /** FCR-044: optional — send the real selected value or omit; never fabricate. */
  building_type?: BuildingType;
  /** FCR-044: optional — send the real selected value or omit; never fabricate. */
  usage?: string;
  user_query: string;
  area_m2?: number;
  floors?: number;
  occupants?: number;
  ceiling_height_m?: number;
  volume_m3?: number;
  category?: RuleCategory;
  standard?: string;
  /** Response + dataset language (es | en). Defaults to "es" on the backend. */
  language?: Language;
  /** FCR-042: trimmed prior turns (most recent last), excludes current user_query. */
  conversation?: ConversationTurn[];
  /**
   * FCR-042: page + optional project for conversational continuity.
   * FCR-047: demo mode is derived from `context.page === "demo"` (no separate
   * flag) — the public /demo page sets it; the BE forces it on /demo/evaluate.
   */
  context?: EvaluateContext;
}

/**
 * 429 CTA payload returned by POST /demo/evaluate when a visitor exceeds the
 * daily demo evaluation cap (FCR-047). Surfaced to callers as DemoLimitError.
 */
export interface DemoLimitResponse {
  type: "demo_limit";
  message: string;
  limit: number;
  cta: string;
  ctaAction: "signup" | "upgrade";
  ctaHref: string;
}

/** Thrown by fireCodeApi.evaluateDemo on HTTP 429 (demo daily cap reached). */
export class DemoLimitError extends Error {
  readonly payload: DemoLimitResponse;
  constructor(payload: DemoLimitResponse) {
    super(payload.message);
    this.name = "DemoLimitError";
    this.payload = payload;
  }
}

/**
 * FCR-026: plan-quota payload. The backend returns this typed body on:
 *   - HTTP 402 from POST/PUT /projects (saved-projects limit reached), and
 *   - HTTP 429 from POST /evaluate (monthly evaluate quota reached) — there it
 *     also carries `remaining` + `reset` and is mirrored on X-Quota-* headers.
 * The FE renders it as the UpgradeModal call-to-action.
 */
export interface QuotaExceededBody {
  type: "quota_exceeded";
  message: string;
  limit: number;
  current?: number;
  /** "saved_projects" (402) | "evaluate" (429, from headers when body omits it). */
  resource?: string;
  tier?: string;
  remaining?: number;
  reset?: string;
  ctaAction?: "upgrade";
}

/**
 * Thrown by the authenticated project + evaluate methods when an org hits a
 * plan quota. `kind` tells the UI which limit was hit so the modal can tailor
 * its copy; `status` is the raw HTTP code (402 saved-projects | 429 evaluate).
 */
export class QuotaError extends Error {
  readonly payload: QuotaExceededBody;
  readonly kind: "saved_projects" | "evaluate";
  readonly status: 402 | 429;
  constructor(payload: QuotaExceededBody, status: 402 | 429) {
    super(payload.message);
    this.name = "QuotaError";
    this.payload = payload;
    this.status = status;
    this.kind = status === 402 ? "saved_projects" : "evaluate";
  }
}

// ── Project DTOs (mirror fire-code-be src/dtos/project_dto.py) ────────────────

/** Backend stores building_type as a lowercase string enum. */
export type ProjectBuildingType = "residencial" | "comercial" | "industrial";

/** Request body for POST /projects (ProjectCreate). */
export interface ProjectCreateRequest {
  name: string;
  /** FCR-102: 'fire' (default) | 'electrical'. */
  project_type?: string;
  building_type: ProjectBuildingType;
  usage: string;
  area_m2?: number;
  floors?: number;
  occupants?: number;
  ceiling_height_m?: number;
  volume_m3?: number;
  requirements?: string[];
  reference?: string[];
  context_cr?: string[];
  /** FCR-102: { inputs, topology, result } snapshot for electrical projects. */
  electrical?: { inputs: ElectricalInputs; topology: Topology; result: ElectricalLoadData };
  risk: string;
}

/** FCR-118: the persisted electrical-study snapshot nested inside a project. */
export interface ElectricalSnapshot {
  inputs: ElectricalInputs;
  topology: Topology;
  result: ElectricalLoadData;
}

/** Request body for PUT /projects/{id} (ProjectUpdate) — all fields optional. */
export type ProjectUpdateRequest = Partial<ProjectCreateRequest>;

/** Response body for project operations (ProjectResponse, camelCase aliases). */
export interface ProjectResponse {
  id: string;
  name: string;
  buildingType: ProjectBuildingType;
  usage: string;
  areaM2?: number | null;
  floors?: number | null;
  occupants?: number | null;
  ceilingHeightM?: number | null;
  volumeM3?: number | null;
  requirements: string[];
  reference: string[];
  contextCr: string[];
  risk: string;
  /** FCR-102/118: 'fire' (default) | 'electrical'. */
  projectType?: string;
  /** FCR-118: present for electrical projects — the saved study snapshot. */
  electrical?: ElectricalSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

/** Response body for GET /projects (ProjectListResponse). */
export interface ProjectListResponse {
  data: ProjectResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProjectsParams {
  page?: number;
  page_size?: number;
  building_type?: ProjectBuildingType;
  usage?: string;
}

/** Structured Costa-Rica regulatory context entry (FCR-043). */
export interface CrContextItem {
  topic: string;
  detail: string;
  authority?: string | null;
  reference?: string | null;
}

export interface EvaluateResponse {
  matchedRules: RuleDTO[];
  requirements: string[];
  reference: string[];
  /** FCR-043: structured. May still be string[] from older backends. */
  contextCr: CrContextItem[];
  risk: string;
  foundryUsed: boolean;
}

/** FCR-101: a single clarifying question the agent needs answered. */
export interface NeedsInfoQuestion {
  key: string;
  label: string;
  /** FCR-114: dynamic input types — `select` = one option, `multi_select` = many. */
  type?: "text" | "number" | "select" | "multi_select";
  required?: boolean;
  hint?: string;
  options?: string[];
}

/** FCR-101: `needs_info` response payload — structured questions + inferred context. */
export interface NeedsInfoData {
  questions: NeedsInfoQuestion[];
  context?: Record<string, unknown>;
}

// ── Electrical preliminary-load (FCR-102+) ───────────────────────────────────
// camelCase on the wire, mirroring ProjectResponse aliases. The agent emits
// ElectricalInputs in its action payload; the interactive editor posts
// { inputs, topology? } to POST /electrical/preliminary (authenticated,
// deterministic, no Foundry, NOT eval-quota-gated) and receives an
// ElectricalLoadData snapshot the FE uses to drive the load table / kVA.

export type ElectricalOccupancy =
  | "residencial"
  | "comercial"
  | "industrial"
  | "social_interest";

/** 1ph 120/240 ; 3-wire 120/208 ; 3ph. */
export type ElectricalServiceType =
  | "single_phase"
  | "network_3h"
  | "three_phase";

export interface ElectricalMotorLoad {
  name?: string;
  hp?: number;
  kw?: number;
  quantity?: number;
}

export interface ElectricalOtherLoad {
  name: string;
  va: number;
}

export interface ElectricalSpecialLoads {
  range_va?: number;
  water_heater_va?: number;
  ac_va?: number;
  other?: ElectricalOtherLoad[];
  motors?: ElectricalMotorLoad[];
}

/** Agent emits this in its action payload; the FE editor posts it. */
export interface ElectricalInputs {
  occupancy: ElectricalOccupancy;
  area_m2: number;
  floors?: number;
  service: ElectricalServiceType;
  voltage?: number;
  special_loads?: ElectricalSpecialLoads;
  /** Fraction e.g. 0.25; default 0. */
  growth_allowance?: number;
  language?: Language;
}

// ── Topology (editable single-line diagram) ──────────────────────────────────

export type TopologyNodeType =
  | "utility"
  | "meter"
  | "main_breaker"
  | "spd"
  | "panel"
  | "load";

export type TopologyPhase = "A" | "B" | "C" | "ABC";

export interface TopologyNodeData {
  va?: number;
  rating?: string;
  phase?: TopologyPhase;
  note?: string;
}

export interface TopologyNode {
  id: string;
  type: TopologyNodeType;
  label: string;
  data?: TopologyNodeData;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// ── ElectricalLoadResponse (BE -> FE, camelCase aliases) ──────────────────────

export interface LoadTableRow {
  description: string;
  connectedVa: number;
  demandFactor: number;
  demandedVa: number;
  phase?: string;
}

export interface MandatedProvision {
  code: string;
  requirement: string;
  reference: string;
  status: "required" | "info";
}

export interface PhaseBalanceEntry {
  phase: string;
  va: number;
}

export interface ElectricalLoadData {
  occupancy: string;
  serviceType: string;
  installedVa: number;
  demandedVa: number;
  demandKva: number;
  suggestedTransformerKva: number;
  loadTable: LoadTableRow[];
  phaseBalance: PhaseBalanceEntry[];
  topology: Topology;
  mandatedProvisions: MandatedProvision[];
  assumptions: string[];
  references: string[];
  disclaimer: string;
  notes?: string;
}

/** Request body for POST /electrical/preliminary. */
export interface ElectricalPreliminaryRequest {
  inputs: ElectricalInputs;
  topology?: Topology;
}

// ── API client ───────────────────────────────────────────────────────────────

/** A non-2xx answer from the public API. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function toQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return query ? `?${query}` : "";
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!PUBLIC_API) throw new Error("The public API is not configured (VITE_PUBLIC_API_URL)");
  const response = await signedPublicRequest(PUBLIC_API, method, path, { body });
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

function asDemoLimit(obj: unknown): DemoLimitResponse | null {
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const inner = (o.detail && typeof o.detail === "object" ? o.detail : o) as Record<string, unknown>;
    if (inner.type === "demo_limit") return inner as unknown as DemoLimitResponse;
  }
  return null;
}

export const fireCodeApi = {
  /**
   * GET /rules — returns rules grouped by fire protection category.
   * All params are optional; omitting them returns all groups.
   */
  getRules(params: GetRulesParams = {}): Promise<RuleListResponse> {
    return call<RuleListResponse>("GET", `/rules${toQueryString(params as Record<string, unknown>)}`);
  },

  /**
   * GET /rules/{ruleId} — fetch a single rule by ID.
   * Returns null when the rule is not found (404).
   */
  async getRuleById(ruleId: string): Promise<RuleDTO | null> {
    try {
      return await call<RuleDTO>("GET", `/rules/${encodeURIComponent(ruleId)}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  /** The landing only has the public demo: every evaluation is a demo evaluation. */
  evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    return fireCodeApi.evaluateDemo(request);
  },

  /**
   * POST /demo/evaluate — PUBLIC, throttled demo evaluation (FCR-047).
   *
   * The backend forces demo mode (teaser answer, never creates a project) and caps successful
   * AI evals per visitor per day; on exceed it returns HTTP 429 with a sign-up CTA payload,
   * rethrown as a typed DemoLimitError so the UI renders the call-to-action.
   */
  async evaluateDemo(request: EvaluateRequest): Promise<EvaluateResponse> {
    // Demo mode is signalled by context.page === "demo" (no flag). Force it here
    // too so the BE enters DEMO MODE even if a caller omitted the context.
    const body = {
      ...request,
      context: { ...(request.context ?? {}), page: "demo" as const, project: request.context?.project ?? null },
    };
    try {
      return await call<EvaluateResponse>("POST", "/demo/evaluate", body);
    } catch (err: unknown) {
      const limit = err instanceof ApiError && err.status === 429 ? asDemoLimit(err.body) : null;
      if (limit) throw new DemoLimitError(limit);
      throw err;
    }
  },

  /**
   * POST /demo/electrical — PUBLIC, deterministic preliminary electrical study
   * for the guided demo's 4th step (FCR-118). No Foundry, no quota.
   */
  evaluateDemoElectrical(inputs: ElectricalInputs): Promise<ElectricalLoadData> {
    return call<ElectricalLoadData>("POST", "/demo/electrical", inputs);
  },
};
