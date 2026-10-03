import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { t } from "@/lib/i18n";
import { ChatPanel, type Msg } from "@/components/ChatPanel";

const api = vi.hoisted(() => ({ evaluateDemo: vi.fn() }));
vi.mock("@/services/sokolApi", () => ({
  sokolApi: api, BuildingType: { residencial: 1, comercial: 2, industrial: 3 },
  DemoLimitError: class extends Error {}, QuotaError: class extends Error {},
}));
vi.mock("@/contexts/LangContext", () => ({ useLang: () => ({ lang: "en", tr: t.en }) }));
vi.mock("@/components/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/components/assistant/WelcomeState", () => ({
  WelcomeState: ({ onPick }: { onPick: (scenario: unknown) => void }) =>
    <button onClick={() => onPick({ query: "Evaluate an office", params: { building_type: 2, usage: "office", area_m2: 100 } })}>Start scenario</button>,
}));
vi.mock("@/components/assistant/NeedsInfoForm", () => ({
  NeedsInfoForm: ({ onSubmit }: { onSubmit: (summary: string, answers: Record<string, string>) => void }) =>
    <button onClick={() => onSubmit("30", { occupants: "30" })}>Answer question</button>,
}));
Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps the teaser stage when the agent asks a clarifying question", async () => {
  api.evaluateDemo.mockResolvedValueOnce({ type: "needs_info", data: {
    questions: [{ key: "occupants", label: "Occupants?", type: "number", required: true }], context: {},
  } }).mockResolvedValueOnce({ type: "message", data: { message: "Complete agent teaser" } });
  function Harness() {
    const [messages, setMessages] = useState<Msg[]>([]);
    return <ChatPanel demo buildingType={2} usage="office" messages={messages} setMessages={setMessages} onClose={() => {}} />;
  }
  render(<MemoryRouter><Harness /></MemoryRouter>);
  fireEvent.click(screen.getByText("Start scenario"));
  fireEvent.click(await screen.findByText("Answer question"));
  await waitFor(() => expect(api.evaluateDemo).toHaveBeenCalledTimes(2));
  for (const [body] of api.evaluateDemo.mock.calls) {
    expect(body.context).toEqual({ page: "demo", project: null, demo_step: "teaser" });
    expect(body.area_m2).toBeUndefined();
  }
  expect(await screen.findByText("Complete agent teaser")).toBeInTheDocument();
});
