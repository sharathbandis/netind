"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  const [posts, setPosts] = useState<any[]>([]);
  const [authorName, setAuthorName] = useState("Loading...");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const getProfileData = async () => {
      // 1. Get the logged-in user so we can still handle likes
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      // 2. Fetch posts ONLY for this specific user ID
      const { data } = await supabase
        .from('posts')
        .select('*, likes(user_id)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setPosts(data);
        setAuthorName(data[0].author_name); // Grab name from their post
      } else {
        setAuthorName("Anonymous Rebel"); // Fallback
      }
    };

    if (profileId) {
      getProfileData();
    }
  }, [profileId]);

  const handleLike = async (postId: number, hasLiked: boolean) => {
    if (!currentUser) return;
    
    if (hasLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: currentUser.id });
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
    }
    
    // Refresh just this profile's feed silently
    const { data } = await supabase
        .from('posts')
        .select('*, likes(user_id)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button 
          onClick={() => router.push('/feed')}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">{authorName}'s Profile</h1>
      </nav>

      <main className="max-w-2xl mx-auto mt-8 px-4 pb-12">
        
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8 mb-6 flex flex-col items-center text-center transition-colors duration-300 shadow-sm dark:shadow-none">
          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center mb-4 transition-colors duration-300">
            <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
              {authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{authorName}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Verified Netind User</p>
          <div className="mt-4 px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium">
            {posts.length} Posts
          </div>
        </div>

        {/* User's Timeline */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center p-8 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50">
              This user hasn't posted anything yet.
            </div>
          ) : (
            posts.map((post) => {
              const userHasLiked = post.likes?.some((like: any) => like.user_id === currentUser?.id);
              const likeCount = post.likes?.length || 0;

              return (
                <div key={post.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors duration-300 shadow-sm dark:shadow-none">
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-2">
                    <span className="text-xs text-slate-500">
                       {new Date(post.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={() => handleLike(post.id, userHasLiked)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${userHasLiked ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'}`}
                    >
                      <Heart className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{likeCount}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>
    </div>
  );
}