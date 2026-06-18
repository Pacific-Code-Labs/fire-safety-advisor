# FireCode CR — Frontend

React + TypeScript web app that helps interpret NFPA fire protection standards for Costa Rica. Filters rules by building characteristics, displays them grouped by category, and provides an AI-powered chat assistant.

**Live site:** `https://chepelcr.github.io/fire-safety-advisor`
**API:** `https://fire-api.jcampos.dev`

---

## Features

- **Rule browser** — filter by building type, area, usage, floors, occupants, ceiling height, and volume
- **Category cards** — rules grouped into Iniciación, Notificación, Monitoreo, Accionamiento
- **Rule detail modal** — click any rule to see technical requirements, installation specs, inspection checklist, and failure risks
- **AI chat assistant** — ask questions in natural language; calls the `/evaluate` endpoint which uses Azure AI Foundry
- **Bilingual** — Spanish / English toggle
- **Printable** — Export / Print button generates a clean print view

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query (react-query) |
| AWS auth | AWS Amplify v6 (SigV4 via Cognito Identity Pool) |
| Package manager | Bun |
| Deployment | GitHub Pages (GitHub Actions) |

---

## Project Structure

```
fire-safety-advisor/
├── src/
│   ├── config/
│   │   └── amplify.ts              # Amplify + Cognito + REST API config (loaded in main.tsx)
│   ├── services/
│   │   └── fireCodeApi.ts          # Typed API client (getRules, getRuleById, evaluate)
│   ├── pages/
│   │   └── Index.tsx               # Main page: filter state, useQuery, layout
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── BuildingSelector.tsx    # Building type + 6 filter inputs
│   │   ├── CategoryCard.tsx        # Rule group card with click-to-detail
│   │   ├── RuleDetailModal.tsx     # Full rule detail (4 tabs)
│   │   └── ChatPanel.tsx           # AI chat — calls POST /evaluate
│   ├── contexts/
│   │   └── LangContext.tsx         # Language toggle (es / en)
│   ├── lib/
│   │   ├── i18n.ts                 # Translation dictionaries
│   │   └── utils.ts                # Tailwind class merger
│   └── main.tsx                    # App entry point (imports amplify config first)
├── .github/
│   └── workflows/
│       └── deploy-pages.yml        # Build + deploy to GitHub Pages
├── .env.local                      # Local env vars (gitignored)
├── .env.local.example              # Template for local setup
└── public/
```

---

## API Integration

All API calls are SigV4-signed automatically via anonymous Cognito Identity Pool credentials. No login is required — every visitor gets a temporary anonymous `IdentityId`.

### `fireCodeApi.getRules(params)`
Called on page load and whenever filters change. Returns rules grouped by category.

```typescript
import { fireCodeApi } from "@/services/fireCodeApi";

const groups = await fireCodeApi.getRules({
  building_type: BuildingType.comercial,  // → 2
  usage: "restaurante",
  area_m2: 450,
  floors: 3,
});
// → RuleGroupDTO[]
```

### `fireCodeApi.evaluate(request)`
Called by the chat panel. Sends the user's question with the current building context.

```typescript
const result = await fireCodeApi.evaluate({
  building_type: BuildingType.comercial,  // → 2
  usage: "restaurante",
  user_query: "¿Necesito rociadores en la cocina?",
  area_m2: 450,
});
// → EvaluateResponse { matchedRules, requirements, reference, contextCr, risk, foundryUsed }
```

---

## Local Development

### Prerequisites
- [Bun](https://bun.sh) installed
- AWS credentials for the `J-CAMPOS` profile (needed for Cognito SigV4 signing)

### Setup

```bash
# Install dependencies
bun install

# Create local env file
cp .env.local.example .env.local
# .env.local is already populated with dev Cognito values — no edits needed

# Start dev server
bun run dev
```

App runs at `http://localhost:8080`.

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_AWS_REGION` | AWS region (`us-east-1`) |
| `VITE_COGNITO_IDENTITY_POOL_ID` | Cognito Identity Pool ID for anonymous SigV4 |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Cognito User Pool Client ID |
| `VITE_API_BASE_URL` | API base URL (`https://fire-api.jcampos.dev`) |

These are also set as GitHub repository secrets so they are injected at build time in CI.

---

## Deployment

Deployments are automatic — every push to `main` triggers the GitHub Actions workflow:

1. `bun install`
2. `bun run build` (Vite injects `VITE_*` secrets from GitHub repository secrets)
3. Deploy `dist/` to GitHub Pages

To trigger manually:
```bash
gh workflow run deploy-pages.yml --repo chepelcr/fire-safety-advisor
```

---

## Key Types

```typescript
interface RuleGroupDTO {
  type: string;        // "iniciacion" | "notificacion" | "monitoreo" | "accionamiento"
  description: string; // human-readable category label
  quantity: number;
  rules: RuleDTO[];
}

interface RuleDTO {
  id: string;
  standard: string;    // e.g. "NFPA 72"
  title: string;
  category: string;
  description: string;
  risk: { level: string; impact: string; consequence: string };
  technical_requirements: string[];
  installation_requirements: string[];
  inspection_requirements: string[];
  failure_risks: string[];
  applies_to: string[];
  conditions: string[];
  keywords: string[];
}

interface EvaluateResponse {
  matchedRules: RuleDTO[];
  requirements: string[];
  reference: string[];
  contextCr: string[];
  risk: string;
  foundryUsed: boolean;
}
```

---

## Backend

See [fire-code-cr-be](https://github.com/chepelcr/fire-code-cr-be) for the FastAPI Lambda backend, CloudFormation stacks, and CI/CD pipeline.
