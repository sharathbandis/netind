"use client";

import { useState } from "react";
import { Mail, Lock, User, ArrowRight, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ text: "Welcome back! Redirecting to your feed...", type: "success" });
        router.push("/feed");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        setMessage({ text: "Welcome to the rebellion. Check your email to verify your account!", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Something went wrong.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* LEFT SIDE - The Pitch */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/20 to-slate-950 -z-10" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -z-10" />

        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">N</div>
          <span className="text-2xl font-bold tracking-tight">Netind.</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Your Network.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Your Rules.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-md leading-relaxed mb-8">
          The professional network built for India. No arbitrary bans, no corporate spam, just real connections and verified talent.
        </p>
      </div>

      {/* RIGHT SIDE - The Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? "Welcome back" : "Join the rebellion"}</h2>
          </div>

          <form className="space-y-4 mt-8" onSubmit={handleAuth}>
            {!isLogin && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text" required={!isLogin} value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Full Name"
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Email address"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Password (min 6 chars)"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-200 border-red-800' : 'bg-green-900/50 text-green-200 border-green-800'}`}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50">
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Join Netind")}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setMessage(null); }} className="text-sm text-indigo-400 hover:text-indigo-300">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}