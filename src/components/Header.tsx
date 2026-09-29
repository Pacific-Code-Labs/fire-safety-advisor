import { Languages, Home, LogIn, Menu, LayoutGrid, ListOrdered, Tag, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { BrandLogo, Button, buttonVariants, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@pacific-code-labs/sokol-design-system";
import { useLang } from "@/contexts/LangContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { tChrome } from "@/lib/chrome-i18n";
import { cn } from "@/lib/utils";
import { getBrandingVM } from "@/services/branding.service";
import { localizedPath, runLangSwitch, stripLangPrefix } from "@/lib/paths";
import { appHref, newTab } from "@/lib/links";

interface HeaderProps {
  /** Page-specific action (e.g. the demo page's assistant toggle). */
  chatButton?: React.ReactNode;
}

interface NavItem {
  key: "features" | "how" | "pricing" | "demo";
  Icon: LucideIcon;
  /** Home section id (scrolls there) or a page path. */
  section?: string;
  path?: string;
}

const NAV: NavItem[] = [
  { key: "features", Icon: LayoutGrid, section: "features" },
  { key: "how", Icon: ListOrdered, section: "how" },
  { key: "pricing", Icon: Tag, path: "/pricing" },
  { key: "demo", Icon: Sparkles, path: "/demo" },
];

export function Header({ chatButton }: HeaderProps) {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { rest } = stripLangPrefix(pathname);
  const onHome = rest === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const chrome = tChrome(lang);
  const brand = getBrandingVM(lang);
  const nextLang = lang === "es" ? "en" : "es";

  const closeMobile = () => setMobileOpen(false);

  // Language toggle navigates to the same page under the other lang prefix
  // (wrapped in the lang animation). LangLayout's effect then syncs the context.
  const switchLang = () => {
    runLangSwitch(navigate, localizedPath(nextLang, rest));
  };

  const hrefFor = (item: NavItem) =>
    item.section ? `${localizedPath(lang, "/")}#${item.section}` : localizedPath(lang, item.path);
  const isActive = (item: NavItem) => !!item.path && rest.startsWith(item.path);

  // On the home page a section link just scrolls; elsewhere the Landing page scrolls to the hash on load.
  // The link of the page you're on scrolls back to its top (a new page starts there anyway).
  const onNavClick = (item: NavItem) => (e: React.MouseEvent) => {
    closeMobile();
    if (item.section && onHome) {
      e.preventDefault();
      document.getElementById(item.section)?.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `#${item.section}`);
    } else if (isActive(item)) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-8">
          <Link to={localizedPath(lang, "/")} className="flex shrink-0 items-center gap-3 hover:opacity-90 transition-opacity">
            {/* Uploaded wordmark (light/dark) when there is one; else mark/icon + name + tagline. */}
            {brand.logoUrl ? (
              <BrandLogo name={brand.companyName} logoUrl={brand.logoUrl} logoUrlDark={brand.logoUrlDark} imgClassName="h-9" />
            ) : (
              <>
                <BrandLogo name={brand.companyName} markUrl={brand.markUrl} Icon={brand.LogoIcon} variant="mark" className="h-10 w-10 glow-red" />
                <div className="leading-tight">
                  <div className="text-lg font-bold tracking-tight">{brand.companyName} <span className="text-primary">{brand.companySuffix}</span></div>
                  <div className="text-xs text-muted-foreground hidden xl:block">{brand.tagline}</div>
                </div>
              </>
            )}
          </Link>

          <nav aria-label={chrome.nav.main} className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.key}
                to={hrefFor(item)}
                onClick={onNavClick(item)}
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "font-medium text-muted-foreground hover:text-foreground",
                  isActive(item) && "bg-muted text-foreground",
                )}
              >
                {chrome.nav[item.key]}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {chatButton}
          {/* The app is a separate site: sign-in opens it in a new tab. */}
          <a href={appHref(lang, "/login")} {...newTab} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
            <LogIn className="h-4 w-4" />
            {chrome.nav.signIn}
          </a>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={switchLang}>
            <Languages className="h-4 w-4" />
            {chrome.nav.langSwitchTo}
          </Button>

          {/* Mobile / tablet menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-8 px-0 lg:hidden" aria-label={chrome.nav.openMenu}>
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
              <nav aria-label={chrome.nav.main} className="mt-6 flex flex-col gap-2">
                <Link to={localizedPath(lang, "/")} onClick={closeMobile} className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}>
                  <Home className="h-4 w-4" />
                  {chrome.nav.home}
                </Link>
                {NAV.map((item) => (
                  <Link
                    key={item.key}
                    to={hrefFor(item)}
                    onClick={onNavClick(item)}
                    aria-current={isActive(item) ? "page" : undefined}
                    className={cn(buttonVariants({ variant: "ghost" }), "justify-start", isActive(item) && "bg-muted")}
                  >
                    <item.Icon className="h-4 w-4" />
                    {chrome.nav[item.key]}
                  </Link>
                ))}
                <a href={appHref(lang, "/login")} {...newTab} onClick={closeMobile} className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}>
                  <LogIn className="h-4 w-4" />
                  {chrome.nav.signIn}
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
