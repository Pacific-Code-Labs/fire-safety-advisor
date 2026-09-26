import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { TooltipProvider } from "@pacific-code-labs/fire-code-design-system";
import Landing from "./pages/Landing.tsx";
import Pricing from "./pages/Pricing.tsx";
import NotFound from "./pages/NotFound.tsx";
import { LangProvider } from "@/contexts/LangContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LangLayout } from "@/components/LangLayout";
import { DEFAULT_LANG, isLang, localizedPath, persistedLang, stripLangPrefix } from "@/lib/paths";
import { appHref, LEGACY_APP_PATHS } from "@/lib/links";

// fire-safety-advisor: the public marketing landing at fire-code.jcampos.dev. Static and
// content-driven: no auth, no app API. The signed-in app is fire-code-app
// (app.fire-code.jcampos.dev) and the admin console is the private fire-code-admin.

/** Old single-site URLs (/<lang>/login, /<lang>/dashboard, /<lang>/demo, …) now live in the app. */
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

const App = () => (
  <ThemeProvider>
    <LangProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Language-prefixed pages (FCR-106): the URL drives i18n (LangLayout). */}
            <Route path="/:lang" element={<LangLayout />}>
              <Route index element={<Landing />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path=":segment/*" element={<LangChild />} />
            </Route>

            <Route path="/" element={<Navigate to={"/" + DEFAULT_LANG} replace />} />
            <Route path="*" element={<LegacyRedirect />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LangProvider>
  </ThemeProvider>
);

export default App;
