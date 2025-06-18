
"use client";

import { useEffect, useCallback } from 'react';

type Theme = "light" | "dark" | "system";

export function ThemeInitializer() {
  const applyThemeToDocument = useCallback((effectiveTheme: "light" | "dark") => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
  }, []);

  const resolveAndApplyTheme = useCallback((preference: Theme) => {
    if (preference === "system") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyThemeToDocument(systemPrefersDark ? "dark" : "light");
    } else {
      applyThemeToDocument(preference);
    }
  }, [applyThemeToDocument]);

  useEffect(() => {
    // This effect runs once on the client after initial mount.
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const initialPreference = storedTheme || "system";
    resolveAndApplyTheme(initialPreference);

    // If preference is "system", set up a listener for changes.
    // This ensures that if the system theme changes while the user has "system" selected,
    // the app's theme updates accordingly.
    if (initialPreference === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleSystemThemeChange = () => {
        // Only re-apply if the current preference in localStorage is still "system" or not set.
        // This prevents this listener from overriding a specific user choice (light/dark) made later.
        const currentStoredTheme = localStorage.getItem("theme") as Theme | null;
        if (currentStoredTheme === "system" || !currentStoredTheme) {
          resolveAndApplyTheme("system");
        }
      };

      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }
  }, [resolveAndApplyTheme]); // Only depends on resolveAndApplyTheme

  return null; // This component does not render any UI
}
