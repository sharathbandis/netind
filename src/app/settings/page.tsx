"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Palette, ShieldCheck, BadgeCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);

      // Fetch the user's profile from our new database table
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', session.user.id)
        .single();

      if (data) setIsVerified(data.is_verified);
    };

    getProfile();
  }, [router]);

  // The Simulated KYC / DigiLocker Function
  const handleVerify = async () => {
    if (!user) return;
    setIsVerifying(true);

    // We use a 2-second timeout to simulate a realistic API call to a government server
    setTimeout(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', user.id);

      setIsVerifying(false);
      if (!error) setIsVerified(true);
      else alert("Verification failed: " + error.message);
    }, 2000);
  };

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
      <main className="max-w-2xl mx-auto mt-8 px-4 space-y-6 pb-12">
        
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
                {isVerified 
                  ? "Your identity has been securely verified. You now have full access to the Netind network." 
                  : "Connect your DigiLocker or Aadhaar to verify your identity and unlock network features."}
              </p>
            </div>
            
            <button
              onClick={handleVerify}
              disabled={isVerified || isVerifying}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isVerified 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              }`}
            >
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