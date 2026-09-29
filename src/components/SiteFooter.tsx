import { Link, useLocation } from "react-router-dom";
import { useLang } from "@/contexts/LangContext";
import { localizedPath, stripLangPrefix } from "@/lib/paths";
import { tChrome } from "@/lib/chrome-i18n";
import { getBrandingVM } from "@/services/branding.service";
import { getFooterVM } from "@/services/landing.service";

/** The landing's footer (content: footer.json + branding.json), shared by every page. */
export function SiteFooter() {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const brand = getBrandingVM(lang);
  const footer = getFooterVM(lang);
  const onDemo = stripLangPrefix(pathname).rest.startsWith("/demo");

  return (
    <footer className="border-t border-border bg-background no-print">
      <div className="container py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {brand.companyName} {brand.companySuffix}. {footer.rights}
        </div>
        <Link
          to={localizedPath(lang, onDemo ? "/" : "/demo")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {onDemo ? tChrome(lang).nav.home : footer.demoLink}
        </Link>
      </div>
    </footer>
  );
}
