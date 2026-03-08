"use client";

import { useState, useEffect } from "react";
import { LogOut, Home, Users, Bell, Search, Send } from "lucide-react";
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
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setPosts(data);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;

    setIsPublishing(true);

    // Grab the name from their account, or use their email prefix if name is missing
    const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Anonymous Rebel";

    const { error } = await supabase
      .from('posts')
      .insert([
        { 
          content: newPost, 
          user_id: user.id,
          author_name: authorName 
        }
      ]);

    setIsPublishing(false);

    if (!error) {
      setNewPost(""); 
      fetchPosts(); 
    } else {
      alert("Error posting: " + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">
            N
          </div>
          <span className="text-xl font-bold tracking-tight hidden md:block">Netind.</span>
        </div>

        <div className="hidden md:flex items-center bg-slate-950 border border-slate-800 rounded-full px-4 py-2 w-1/3">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input 
            type="text" 
            placeholder="Search for verified professionals..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-6">
          <button className="text-indigo-400 hover:text-indigo-300 transition-colors"><Home className="w-6 h-6" /></button>
          <button className="text-slate-400 hover:text-white transition-colors"><Users className="w-6 h-6" /></button>
          <button className="text-slate-400 hover:text-white transition-colors"><Bell className="w-6 h-6" /></button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors ml-4 border-l border-slate-800 pl-4"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-4 grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
        
        <div className="md:col-span-1 hidden md:block">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden sticky top-24">
            <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-indigo-900/40 to-cyan-900/40" />
            <div className="w-16 h-16 bg-slate-800 rounded-full border-4 border-slate-900 relative z-10 flex items-center justify-center mt-4 mb-3">
              <span className="text-2xl font-bold text-slate-400">
                {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white relative z-10 truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Netind User"}
            </h2>
            <p className="text-sm text-slate-400 relative z-10 mb-4">Reclaiming the network.</p>
            <div className="border-t border-slate-800 pt-4 flex justify-between text-sm">
              <span className="text-slate-500">Connections</span>
              <span className="text-indigo-400 font-medium">0</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <form onSubmit={handleCreatePost}>
              <textarea 
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What are you building? (No humblebrags or corporate jargon allowed)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none min-h-[100px]"
              />
              <div className="flex justify-end mt-3">
                <button 
                  type="submit"
                  disabled={isPublishing || !newPost.trim()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                  {!isPublishing && <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold text-slate-300 mb-2">The network is empty.</h3>
                <p className="text-slate-500 max-w-sm">
                  You are the first one here. Send the first post to initialize the rebellion.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold">
                      {post.author_name ? post.author_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      {/* Here is where the real name drops in! */}
                      <h4 className="text-sm font-bold text-slate-200">
                        {post.author_name || "Anonymous Rebel"}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>

      </main>
    </div>
  );
}