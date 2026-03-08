"use client";

import { ArrowLeft, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button 
          onClick={() => router.push('/feed')}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto mt-8 px-4">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors duration-300 shadow-sm dark:shadow-none">
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Theme Preference</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose how Netind looks to you.</p>
            </div>
            <ThemeToggle />
          </div>
          
        </div>
      </main>

    </div>
  );
}