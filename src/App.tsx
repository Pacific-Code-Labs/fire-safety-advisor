import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner, TooltipProvider } from "@pacific-code-labs/fire-code-design-system";
import Landing from "./pages/Landing.tsx";
import Pricing from "./pages/Pricing.tsx";
import NotFound from "./pages/NotFound.tsx";
import { LangProvider } from "@/contexts/LangContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { LangLayout } from "@/components/LangLayout";
import { DemoSkeleton } from "@/components/DemoSkeleton";
import { DEFAULT_LANG, isLang, localizedPath, persistedLang, stripLangPrefix } from "@/lib/paths";
import { appHref, LEGACY_APP_PATHS } from "@/lib/links";

// fire-safety-advisor: the public marketing landing at fire-code.jcampos.dev. Static and
// content-driven: no auth, no app API. The public /demo calls the public gateway (guest SigV4). The signed-in app is fire-code-app
// (app.fire-code.jcampos.dev) and the admin console is the private fire-code-admin.

/** Old single-site URLs (/<lang>/login, /<lang>/dashboard, …) now live in the app. */
function AppRedirect() {
  const { pathname, search, hash } = useLocation();
  const { lang, rest } = stripLangPrefix(pathname);
  useEffect(() => {
    window.location.replace(appHref(lang ?? persistedLang(), rest) + search + hash);
  }, [lang, rest, search, hash]);
  return null;
}

/** Any un-prefixed path: an old app path → the app; anything else → same path under a lang. */
function LegacyRedirect() {
  const location = useLocation();
  const { rest } = stripLangPrefix(location.pathname);
  const first = rest.split("/")[1] ?? "";
  if (LEGACY_APP_PATHS.includes(first)) return <AppRedirect />;
  return <Navigate to={localizedPath(persistedLang(), rest) + location.search + location.hash} replace />;
}

/** /:lang/:segment/* — app paths go to the app, unknown ones 404. */
function LangChild() {
  const { lang, segment } = useParams();
  if (!isLang(lang)) return <LegacyRedirect />;
  return segment && LEGACY_APP_PATHS.includes(segment) ? <AppRedirect /> : <NotFound />;
}

// The demo carries the assistant and the electrical diagram: loaded only when visited.
const Index = lazy(() => import("./pages/Index.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <LangProvider>
      <AssistantProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Language-prefixed pages (FCR-106): the URL drives i18n (LangLayout). */}
            <Route path="/:lang" element={<LangLayout />}>
              <Route index element={<Landing />} />
              <Route path="demo" element={<Suspense fallback={<DemoSkeleton />}><Index /></Suspense>} />
              <Route path="pricing" element={<Pricing />} />
              <Route path=":segment/*" element={<LangChild />} />
            </Route>

            <Route path="/" element={<Navigate to={"/" + DEFAULT_LANG} replace />} />
            <Route path="*" element={<LegacyRedirect />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </AssistantProvider>
    </LangProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
