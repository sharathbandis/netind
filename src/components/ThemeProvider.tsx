"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
// THE FIX: We import the types directly from the main package now!
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}