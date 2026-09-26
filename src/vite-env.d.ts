/// <reference types="vite/client" />

// The landing's ONLY build values (SSM /fire-code/<env>/web/*): no user pool, no app API.
interface ImportMetaEnv {
  /** The signed-in app (app.fire-code.jcampos.dev); SSM site/app-url. */
  readonly VITE_APP_URL?: string;
  /** Anonymous published-content API (public-api.fire-code.jcampos.dev); SSM public-api/url. */
  readonly VITE_PUBLIC_API_URL?: string;
  /** Identity pool whose guests may only read published content; SSM public-api/identity-pool-id. */
  readonly VITE_PUBLIC_IDENTITY_POOL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
