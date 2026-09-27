import type { PublicApiConfig } from "@pacific-code-labs/sokol-design-system";

// The landing's only API: the public gateway (identity-pool guests, SigV4). Published content
// and the demo routes; no user pool and no app API (pnpm check:bundle).
const env = import.meta.env;
export const PUBLIC_API: PublicApiConfig | null =
  env.VITE_PUBLIC_API_URL && env.VITE_PUBLIC_IDENTITY_POOL_ID
    ? { url: env.VITE_PUBLIC_API_URL, identityPoolId: env.VITE_PUBLIC_IDENTITY_POOL_ID }
    : null;
