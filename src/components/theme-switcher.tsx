
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

export default function ThemeSwitcher() {
  // State to hold the user's explicit theme preference
  const [themePreference, setThemePreference] = useState<Theme>("system");
  // State to track if the component has mounted to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  // Function to apply the 'dark' class to the HTML element or remove it
  const applyThemeToDocument = useCallback((effectiveTheme: "light" | "dark") => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark"); // Clear existing theme classes
    root.classList.add(effectiveTheme); // Add the determined theme class
  }, []);

  // Function to determine and apply the visual theme based on preference
  const resolveAndApplyTheme = useCallback((preference: Theme) => {
    if (preference === "system") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyThemeToDocument(systemPrefersDark ? "dark" : "light");
    } else {
      applyThemeToDocument(preference);
    }
  }, [applyThemeToDocument]);

  // Effect for initial theme setup on mount
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const initialPreference = storedTheme || "system";
    setThemePreference(initialPreference);
    resolveAndApplyTheme(initialPreference);
  }, [resolveAndApplyTheme]);

  // Effect to listen for system theme changes when "system" preference is active
  useEffect(() => {
    if (!mounted || themePreference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      resolveAndApplyTheme("system"); // Re-resolve and apply based on new system preference
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [mounted, themePreference, resolveAndApplyTheme]);

  // Function to set a new theme preference
  const changeThemePreference = (newPreference: Theme) => {
    localStorage.setItem("theme", newPreference);
    setThemePreference(newPreference);
    resolveAndApplyTheme(newPreference);
  };

  if (!mounted) {
    // Render a placeholder to avoid hydration mismatch, matching final UI structure
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <Monitor className="h-5 w-5" />
      </Button>
    );
  }

  // Determine which icon to display on the button based on current preference
  let IconToDisplay;
  if (themePreference === "light") IconToDisplay = Sun;
  else if (themePreference === "dark") IconToDisplay = Moon;
  else IconToDisplay = Monitor; // System preference

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <IconToDisplay className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeThemePreference("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeThemePreference("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeThemePreference("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
