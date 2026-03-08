"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1 bg-slate-900/50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-full p-1">
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-full transition-colors ${theme === "light" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-full transition-colors ${theme === "system" ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        title="System Preference"
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-full transition-colors ${theme === "dark" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}