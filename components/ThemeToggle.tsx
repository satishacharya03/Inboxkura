"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full bg-muted/30 border border-border/50 animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted/50 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-850 hover:text-foreground dark:text-neutral-400 dark:hover:text-neutral-200 transition-all duration-200 shadow-sm active:scale-90"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-500 animate-in fade-in zoom-in duration-300" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-indigo-500 animate-in fade-in zoom-in duration-300" />
      )}
    </button>
  );
}
