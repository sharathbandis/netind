"use client";

import { useState, useEffect } from "react";
import { LogOut, Home, Users, Bell, Search, Send, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Feed() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const getUserAndPosts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);
      fetchPosts();
    };
    getUserAndPosts();
  }, [router]);

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;
    setIsPublishing(true);
    const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Anonymous Rebel";
    const { error } = await supabase.from('posts').insert([{ content: newPost, user_id: user.id, author_name: authorName }]);
    setIsPublishing(false);
    if (!error) { setNewPost(""); fetchPosts(); } 
    else { alert("Error posting: " + error.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl text-white">N</div>
          <span className="text-xl font-bold tracking-tight hidden md:block">Netind.</span>
        </div>

        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2 w-1/3 transition-colors duration-300">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input type="text" placeholder="Search for verified professionals..." className="bg-transparent border-none focus:outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-500" />
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button className="text-indigo-600 dark:text-indigo-400"><Home className="w-5 h-5 md:w-6 md:h-6" /></button>
          <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Users className="w-5 h-5 md:w-6 md:h-6" /></button>
          <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Bell className="w-5 h-5 md:w-6 md:h-6" /></button>
          
          <button onClick={() => router.push('/settings')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2 md:ml-4 border-l border-slate-200 dark:border-slate-800 pl-4">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-4 grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
        {/* Sidebar */}
        <div className="md:col-span-1 hidden md:block">
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative overflow-hidden sticky top-24 transition-colors duration-300 shadow-sm dark:shadow-none">
            <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-indigo-100 to-cyan-100 dark:from-indigo-900/40 dark:to-cyan-900/40 transition-colors duration-300" />
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full border-4 border-white dark:border-slate-900 relative z-10 flex items-center justify-center mt-4 mb-3 transition-colors duration-300">
              <span className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white relative z-10 truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Netind User"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10 mb-4">Reclaiming the network.</p>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between text-sm transition-colors duration-300">
              <span className="text-slate-500">Connections</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">0</span>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors duration-300 shadow-sm dark:shadow-none">
            <form onSubmit={handleCreatePost}>
              <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="What are you building? (No humblebrags or corporate jargon allowed)" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none min-h-[100px]" />
              <div className="flex justify-end mt-3">
                <button type="submit" disabled={isPublishing || !newPost.trim()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  {isPublishing ? "Publishing..." : "Publish"}
                  {!isPublishing && <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors duration-300 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold transition-colors duration-300">
                    {post.author_name ? post.author_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{post.author_name || "Anonymous Rebel"}</h4>
                    <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}