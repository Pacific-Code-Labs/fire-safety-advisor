import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { applyActiveTheme } from "@/lib/brand-theme";

export type Theme = "light" | "dark";
interface Ctx { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void; }
const defaultCtx: Ctx = {
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
};
const ThemeCtx = createContext<Ctx>(defaultCtx);

const STORAGE_KEY = "firecode.theme";

function getInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
    // Re-apply the active brand theme in the new mode so the DS theme engine
    // writes the correct light/dark token map (FCR-080).
    applyActiveTheme(theme === "dark");
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
