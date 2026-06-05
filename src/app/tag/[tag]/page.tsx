"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Heart, BadgeCheck, MessageCircle, Repeat, Loader2 } from "lucide-react";
import Link from "next/link";

export default function TagPage() {
  const params = useParams();
  const router = useRouter();
  // Decode the URL in case the tag has special characters
  const rawTag = typeof params.tag === 'string' ? decodeURIComponent(params.tag) : '';
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTagData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      // Search the database for any post containing the hashtag
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *, 
          likes(user_id), 
          bookmarks(user_id),
          profiles(is_verified, username, avatar_url, full_name),
          comments(*, profiles(username, avatar_url, full_name, is_verified))
        `)
        .ilike('content', `%#${rawTag}%`) // The SQL search engine logic
        .order('created_at', { ascending: false });

      if (postsData) setPosts(postsData);
      setIsLoading(false);
    };

    if (rawTag) fetchTagData();
  }, [rawTag]);

  const handleLike = async (postAuthorId: string, postId: number, hasLiked: boolean) => {
    if (!currentUser) return;
    if (hasLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: currentUser.id });
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
      if (postAuthorId !== currentUser.id) {
        await supabase.from('notifications').insert([{ recipient_id: postAuthorId, actor_id: currentUser.id, type: 'like', post_id: postId }]);
      }
    }
    // Refresh feed
    const { data } = await supabase.from('posts').select('*, likes(user_id), profiles(is_verified, username, avatar_url, full_name), comments(*, profiles(username, avatar_url, full_name, is_verified))').ilike('content', `%#${rawTag}%`).order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  // The Magic Text Parser: Turns #tags into links
  const renderContentWithTags = (text: string) => {
    if (!text) return null;
    // Split the text by hashtags
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return (
          <Link key={i} href={`/tag/${tag}`} className="text-indigo-500 dark:text-indigo-400 hover:underline font-medium">
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans pb-12 transition-colors duration-300">
      
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-1">
            #{rawTag}
          </h1>
          <p className="text-xs text-slate-500">{posts.length} posts</p>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto mt-8 px-4">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center p-8 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm">
              No one is talking about #{rawTag} yet. Be the first!
            </div>
          ) : (
            posts.map((post) => {
              const userHasLiked = post.likes?.some((like: any) => like.user_id === currentUser?.id);
              const likeCount = post.likes?.length || 0;
              const commentCount = post.comments?.length || 0;
              
              let displayProfile = post.profiles;
              if (Array.isArray(displayProfile)) displayProfile = displayProfile[0];

              return (
                <div key={post.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/profile/${post.user_id}`} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 hover:opacity-80 transition-opacity">
                       {displayProfile?.avatar_url ? (
                         <img src={displayProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                         <span className="font-bold text-slate-400">{post.author_name?.charAt(0).toUpperCase() || "U"}</span>
                       )}
                    </Link>
                    <div>
                      <Link href={`/profile/${post.user_id}`} className="font-bold text-sm hover:underline flex items-center gap-1">
                        {post.author_name || "Anonymous Rebel"}
                        {displayProfile?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                      </Link>
                      <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* PARSED TEXT RENDERER */}
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">
                    {renderContentWithTags(post.content)}
                  </p>
                  
                  {post.image_url && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img src={post.image_url} alt="Post attachment" className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-2">
                    <button onClick={() => handleLike(post.user_id, post.id, userHasLiked)} className={`flex items-center gap-1.5 text-sm transition-colors ${userHasLiked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}>
                      <Heart className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{likeCount}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-medium">{commentCount}</span>
                    </div>
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