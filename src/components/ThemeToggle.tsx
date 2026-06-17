import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LangContext";
import { tChrome } from "@/lib/chrome-i18n";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { lang } = useLang();
  const chrome = tChrome(lang);
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label={theme === "dark" ? chrome.nav.themeToLight : chrome.nav.themeToDark}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
