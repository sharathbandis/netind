"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Palette, ShieldCheck, BadgeCheck, Loader2, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // New Username States
  const [username, setUsername] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);

      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified, username')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setIsVerified(data.is_verified);
        if (data.username) setUsername(data.username);
      }
    };

    getProfile();
  }, [router]);

  const handleVerify = async () => {
    if (!user) return;
    setIsVerifying(true);
    setTimeout(async () => {
      const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', user.id);
      setIsVerifying(false);
      if (!error) setIsVerified(true);
      else alert("Verification failed: " + error.message);
    }, 2000);
  };

  // THE NEW USERNAME SAVE FUNCTION
  const handleSaveUsername = async () => {
    if (!user || !username.trim()) return;
    setIsSavingUsername(true);
    setUsernameMessage(null);

    // Format the username: lowercase, remove spaces and special characters
    const formattedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const { error } = await supabase
      .from('profiles')
      .update({ username: formattedUsername })
      .eq('id', user.id);

    setIsSavingUsername(false);

    if (error) {
      // Postgres error code '23505' means "Unique constraint violation"
      if (error.code === '23505') {
        setUsernameMessage({ text: "That username is already taken by another rebel.", type: "error" });
      } else {
        setUsernameMessage({ text: "Could not save username. Try again.", type: "error" });
      }
    } else {
      setUsername(formattedUsername);
      setUsernameMessage({ text: "Username claimed successfully!", type: "success" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/feed')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </nav>

      <main className="max-w-2xl mx-auto mt-8 px-4 space-y-6 pb-12">
        
        {/* NEW PROFILE CONFIGURATION SECTION */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors duration-300 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
            <UserCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold">Profile Identity</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Claim your @username</label>
              <div className="flex gap-3">
                <div className="relative flex-grow">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-medium">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="founder"
                    className="block w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleSaveUsername}
                  disabled={isSavingUsername || !username}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isSavingUsername ? "Saving..." : "Save"}
               </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Only letters, numbers, and underscores.</p>
            </div>

            {usernameMessage && (
              <div className={`p-3 rounded-lg text-sm ${usernameMessage.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                {usernameMessage.text}
              </div>
            )}
          </div>
        </div>

        {/* Trust & Safety Section */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors duration-300 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold">Trust & Safety</h2>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                Identity Verification
                {isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {isVerified ? "Your identity has been securely verified." : "Connect your DigiLocker to verify your identity."}
              </p>
            </div>
            
            <button onClick={handleVerify} disabled={isVerified || isVerifying} className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${isVerified ? "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"}`}>
              {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {isVerified ? "Verified" : (isVerifying ? "Verifying..." : "Verify Identity")}
            </button>
          </div>
        </div>

        {/* Appearance Section */}
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