import { createContext, useContext, useEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Theme } from "./types";
import { DEFAULT_THEME } from "./types";
import { fontCssVar, googleFontUrl } from "./themes";

interface ThemeContextValue {
  theme: Theme;
  cssVars: CSSProperties;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  cssVars: {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Resolves a Theme into CSS variables applied to the nearest container. */
export function resolveThemeVars(theme: Theme): CSSProperties {
  const family = fontCssVar(theme);
  const effectiveMode = theme.mode === "system" ? "light" : theme.mode;
  return {
    "--font-family": family,
    "--font-sans": family,
    "--accent": theme.palette.accent,
    "--surface": theme.palette.surface,
    "--text": theme.palette.text,
    "--muted": theme.palette.muted,
    "--page-bg": effectiveMode === "dark" ? "color-mix(in srgb, var(--surface) 92%, black)" : theme.palette.surface,
    colorScheme: effectiveMode,
  } as CSSProperties;
}

/**
 * Applies theme tokens as CSS variables and injects the chosen Google Font.
 * Wrap any subtree that should render with a theme (public page, admin preview).
 */
export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  const cssVars = useMemo(() => resolveThemeVars(theme), [theme]);

  useEffect(() => {
    if (!theme.fontFamily || theme.fontFamily === "Inter") return;
    const id = `gf-${theme.fontFamily.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = googleFontUrl(theme.fontFamily);
    document.head.appendChild(link);
  }, [theme.fontFamily]);

  const value = useMemo(() => ({ theme, cssVars }), [theme, cssVars]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}