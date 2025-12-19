"use client";

import * as React from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  cycleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "bm-theme";

function parseStoredTheme(value: string | null): ThemeMode | null {
  if (value === "light" || value === "dark" || value === "system") return value;
  return null;
}

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function resolveTheme(mode: ThemeMode, media: MediaQueryList | null): ResolvedTheme {
  if (mode === "system") {
    return media?.matches ? "dark" : "light";
  }
  return mode;
}

function applyTheme(mode: ThemeMode, media: MediaQueryList | null) {
  if (typeof document === "undefined") return "light";

  const resolved = resolveTheme(mode, media);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved === "dark" ? "dark" : "light";
  root.dataset.theme = mode;

  return resolved;
}

function persistTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  if (mode === "system") window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const media = getMediaQuery();
    const stored = typeof window !== "undefined" ? parseStoredTheme(window.localStorage.getItem(STORAGE_KEY)) : null;
    const domPref =
      typeof document !== "undefined" ? parseStoredTheme(document.documentElement.dataset.theme ?? null) : null;
    const next = stored ?? domPref ?? "system";

    setThemeState(next);
    setResolvedTheme(applyTheme(next, media));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = parseStoredTheme(event.newValue) ?? "system";
      const media = getMediaQuery();
      setThemeState(next);
      setResolvedTheme(applyTheme(next, media));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  React.useEffect(() => {
    const media = getMediaQuery();
    setResolvedTheme(applyTheme(theme, media));

    const handleChange = () => {
      if (theme === "system") {
        setResolvedTheme(applyTheme("system", media));
      }
    };

    media?.addEventListener("change", handleChange);
    return () => media?.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = React.useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    persistTheme(mode);
  }, []);

  const cycleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const order: ThemeMode[] = ["system", "dark", "light"];
      const next = order[(order.indexOf(prev) + 1) % order.length];
      persistTheme(next);
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, cycleTheme }),
    [theme, resolvedTheme, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
