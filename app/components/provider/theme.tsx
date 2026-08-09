import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "BCC007Theme",
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Initialize theme from localStorage after mount
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    } else {
      setThemeState(defaultTheme);
    }
  }, [storageKey, defaultTheme]);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      localStorage.setItem(storageKey, "system");
      return;
    }
    root.classList.add(theme);
    localStorage.setItem(storageKey, theme);
  }, [theme, mounted, storageKey]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
