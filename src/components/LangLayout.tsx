import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import { DEFAULT_LANG, isLang, stripLangPrefix } from "@/lib/paths";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import { HeaderSlotContext } from "@/lib/header-slot";

/**
 * Shell for the /:lang/* routes. Validates the :lang segment, syncs the
 * LangContext to the URL's language (one-way: URL → context), and renders the
 * matched child route inside a <PageTransition>. The header lives here, outside
 * the transition, so it stays put while pages change.
 *
 * Navigation is NOT done here on context change — LangContext.setLang stays a
 * pure state+localStorage update (admin-safe). Callers that want to switch the
 * URL language use useNavigate + localizedPath.
 */
export function LangLayout() {
  const { lang: urlLang } = useParams();
  const location = useLocation();
  const { lang: ctxLang, setLang } = useLang();
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (urlLang && isLang(urlLang) && urlLang !== ctxLang) {
      setLang(urlLang);
    }
    // Sync only when the URL language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLang]);

  if (!urlLang || !isLang(urlLang)) {
    return <Navigate to={"/" + DEFAULT_LANG + stripLangPrefix(location.pathname).rest} replace />;
  }

  return (
    <HeaderSlotContext.Provider value={actionsSlot}>
      <Header actionsRef={setActionsSlot} />
      <PageTransition>
        <Outlet />
      </PageTransition>
    </HeaderSlotContext.Provider>
  );
}

export default LangLayout;
