import { Languages, Home, LogIn, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@pacific-code-labs/sokol-design-system";
import { useLang } from "@/contexts/LangContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { tChrome } from "@/lib/chrome-i18n";
import { getBrandingVM } from "@/services/branding.service";
import { localizedPath, runLangSwitch, stripLangPrefix } from "@/lib/paths";
import { appHref, newTab } from "@/lib/links";

interface HeaderProps {
  chatButton?: React.ReactNode;
}

export function Header({ chatButton }: HeaderProps) {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onHome = stripLangPrefix(pathname).rest === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const chrome = tChrome(lang);
  const brand = getBrandingVM(lang);
  const nextLang = lang === "es" ? "en" : "es";

  const closeMobile = () => setMobileOpen(false);

  // Language toggle navigates to the same page under the other lang prefix
  // (wrapped in the lang animation). LangLayout's effect then syncs the context.
  const switchLang = () => {
    const { rest } = stripLangPrefix(pathname);
    runLangSwitch(navigate, localizedPath(nextLang, rest));
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="container flex h-16 items-center justify-between">
        <Link to={localizedPath(lang, "/")} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          {/* Uploaded wordmark (light/dark) when there is one; else mark/icon + name + tagline. */}
          {brand.logoUrl ? (
            <BrandLogo name={brand.companyName} logoUrl={brand.logoUrl} logoUrlDark={brand.logoUrlDark} imgClassName="h-9" />
          ) : (
            <>
              <BrandLogo name={brand.companyName} markUrl={brand.markUrl} Icon={brand.LogoIcon} variant="mark" className="h-10 w-10 glow-red" />
              <div className="leading-tight">
                <div className="text-lg font-bold tracking-tight">{brand.companyName} <span className="text-primary">{brand.companySuffix}</span></div>
                <div className="text-xs text-muted-foreground hidden sm:block">{brand.tagline}</div>
              </div>
            </>
          )}
        </Link>
        <div className="flex items-center gap-2">
          {!onHome && (
            <Button asChild variant="ghost" size="sm" className="gap-2 hidden sm:inline-flex">
              <Link to={localizedPath(lang, "/")}>
                <Home className="h-4 w-4" />
                {chrome.nav.home}
              </Link>
            </Button>
          )}
          {chatButton}
          {/* The app is a separate site: sign-in opens it in a new tab. */}
          <Button asChild variant="ghost" size="sm" className="gap-2 hidden sm:inline-flex">
            <a href={appHref(lang, "/login")} {...newTab}>
              <LogIn className="h-4 w-4" />
              {chrome.nav.signIn}
            </a>
          </Button>
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={switchLang}
            className="gap-2"
          >
            <Languages className="h-4 w-4" />
            {chrome.nav.langSwitchTo}
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden" aria-label={chrome.nav.openMenu}>
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <brand.LogoIcon className="h-4 w-4 text-primary" aria-hidden />
                  {brand.companyName} <span className="text-primary">{brand.companySuffix}</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                <Button asChild variant="ghost" className="justify-start gap-2" onClick={closeMobile}>
                  <Link to={localizedPath(lang, "/")}>
                    <Home className="h-4 w-4" />
                    {chrome.nav.home}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start gap-2" onClick={closeMobile}>
                  <a href={appHref(lang, "/login")} {...newTab}>
                    <LogIn className="h-4 w-4" />
                    {chrome.nav.signIn}
                  </a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
