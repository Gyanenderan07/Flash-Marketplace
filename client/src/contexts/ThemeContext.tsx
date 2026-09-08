import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("flash_seller_theme") || localStorage.getItem("flash-seller-theme");
      if (stored === "dark" || stored === "light") {
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          root.classList.remove("dark", "light");
          root.classList.add(stored);
          root.setAttribute("data-theme", stored);
          root.style.colorScheme = stored;
        }
        return stored;
      }
    } catch {
      // localStorage unavailable
    }
    // Respect system preference if no stored value
    let initial: Theme = defaultTheme;
    if (typeof window !== "undefined" && window.matchMedia) {
      initial = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : defaultTheme;
    }
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.classList.add(initial);
      root.setAttribute("data-theme", initial);
      root.style.colorScheme = initial;
    }
    return initial;
  });

  // Ensure DOM is in sync on mount/changes
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains(theme)) {
      root.classList.remove("dark", "light");
      root.classList.add(theme);
    }
    if (root.getAttribute("data-theme") !== theme) {
      root.setAttribute("data-theme", theme);
    }
    if (root.style.colorScheme !== theme) {
      root.style.colorScheme = theme;
    }
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";

    // 1. Instant synchronous DOM flip — CSS variables update immediately in current paint frame
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(nextTheme);
    root.setAttribute("data-theme", nextTheme);
    root.style.colorScheme = nextTheme;

    // 2. React non-blocking transition for React consumers (icons, charts)
    React.startTransition(() => {
      setTheme(nextTheme);
    });

    // 3. Defer non-critical localStorage I/O outside of the critical render path
    if (typeof window !== "undefined") {
      const persist = () => {
        try {
          localStorage.setItem("flash_seller_theme", nextTheme);
          localStorage.setItem("flash-seller-theme", nextTheme);
        } catch {
          // localStorage unavailable
        }
      };

      if ("requestIdleCallback" in window) {
        (window as unknown as { requestIdleCallback: (fn: () => void) => void }).requestIdleCallback(persist);
      } else {
        setTimeout(persist, 0);
      }
    }
  }, [theme]);

  const contextValue = React.useMemo(
    () => ({
      theme,
      toggleTheme,
      isDark: theme === "dark",
    }),
    [theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
