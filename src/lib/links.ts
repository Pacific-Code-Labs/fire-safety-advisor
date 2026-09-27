// The signed-in app lives on its own domain; the landing only links to it, in a new tab.
// URL from SSM /sokol/<env>/web/site/app-url (VITE_APP_URL), prod domain by default.
import type { Lang } from "@/lib/i18n";

export const APP_URL = (import.meta.env.VITE_APP_URL || "https://app.sokol.jcampos.dev").replace(/\/+$/, "");

/** App URL for a path in the visitor's language, e.g. appHref("es", "/login"). */
export const appHref = (lang: Lang | string, path = "/") => `${APP_URL}/${lang}${path === "/" ? "" : path}`;

/** Props for links that open the app in a new tab. */
export const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * First path segments (after /<lang>) of the old single-site app. Visits — old emails, bookmarks,
 * the admin's "view on site" links — are forwarded to the same path on the app.
 */
export const LEGACY_APP_PATHS = [
  "login",
  "register",
  "verify-email",
  "forgot-password",
  "reset-password",
  "dashboard",
  "organizations",
  "projects",
];
