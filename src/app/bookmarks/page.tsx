"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Heart, BadgeCheck, MessageCircle, Repeat, Trash2, Bookmark as BookmarkIcon, Loader2, Send } from "lucide-react";
import Link from "next/link";

export default function BookmarksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    const loadVault = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileData) setCurrentProfile(profileData);

      fetchBookmarks(session.user.id);
    };
    loadVault();
  }, [router]);

  const fetchBookmarks = async (userId: string) => {
    // We fetch the bookmarks, and ask Supabase to grab the full Post object attached to it
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        created_at,
        post:posts (
          *, 
          likes(user_id), 
          bookmarks(user_id),
          profiles(is_verified, username, avatar_url, full_name),
          comments(*, profiles(username, avatar_url, full_name, is_verified))
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      // Flatten the data so it looks exactly like our standard Feed array
      const postsArray = data
        .map(b => b.post)
        .filter(Boolean) // Filter out nulls just in case a post was deleted
        .map((post: any) => ({
          ...post,
          comments: post.comments?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
        }));
      setBookmarkedPosts(postsArray);
    }
    setIsLoading(false);
  };

  const handleLike = async (postAuthorId: string, postId: number, hasLiked: boolean) => {
    if (!user) return;
    if (hasLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
      if (postAuthorId !== user.id) {
        await supabase.from('notifications').insert([{ recipient_id: postAuthorId, actor_id: user.id, type: 'like', post_id: postId }]);
      }
    }
    fetchBookmarks(user.id);
  };

  // UX MAGIC: If they click bookmark here, it instantly removes it from the Vault UI
  const handleRemoveBookmark = async (postId: number) => {
    if (!user) return;
    await supabase.from('bookmarks').delete().match({ post_id: postId, user_id: user.id });
    setBookmarkedPosts(current => current.filter(post => post.id !== postId));
  };

  const handleSubmitComment = async (e: React.FormEvent, postAuthorId: string, postId: number) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setIsCommenting(true);
    const { error } = await supabase.from('comments').insert([{ content: commentText, user_id: user.id, post_id: postId }]);
    setIsCommenting(false);
    if (!error) { 
      setCommentText(""); 
      fetchBookmarks(user.id); 
      if (postAuthorId !== user.id) {
        await supabase.from('notifications').insert([{ recipient_id: postAuthorId, actor_id: user.id, type: 'comment', post_id: postId }]);
      }
    } 
  };

  const handleRepost = async (postAuthorId: string, postId: number) => {
    if (!user) return;
    const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Anonymous Rebel";
    const { error } = await supabase.from('posts').insert([{ user_id: user.id, author_name: authorName, original_post_id: postId, content: "" }]);
    if (!error) {
      alert("Reposted successfully!");
      if (postAuthorId !== user.id) {
        await supabase.from('notifications').insert([{ recipient_id: postAuthorId, actor_id: user.id, type: 'repost', post_id: postId }]);
      }
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans pb-12 transition-colors duration-300">
      
      {/* Header Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push('/feed')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              The Vault
            </h1>
            <p className="text-xs text-slate-500">Your privately saved posts</p>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto mt-6 px-4">
        <div className="space-y-4">
          {bookmarkedPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
              <BookmarkIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <h2 className="text-lg font-bold mb-2">Your vault is empty</h2>
              <p className="text-sm text-slate-500">Save posts to your vault to read them later. Only you can see what you've saved.</p>
              <Link href="/feed" className="inline-block mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors">
                Explore Feed
              </Link>
            </div>
          ) : (
            bookmarkedPosts.map((post) => {
              const userHasLiked = post.likes?.some((like: any) => like.user_id === user?.id);
              const likeCount = post.likes?.length || 0;
              const commentCount = post.comments?.length || 0;
              const isCommentsOpen = activeCommentPostId === post.id;

              let isRepost = false;
              let displayPost = post;
              let displayProfile = post.profiles;

              if (post.original_post_id) {
                 isRepost = true;
                 // Note: Deep population of reposts in bookmarks might require complex queries. 
                 // For the vault, we render the original post details directly if available.
              }
              
              if (Array.isArray(displayProfile)) displayProfile = displayProfile[0];

              const displayVerified = displayProfile?.is_verified || false;
              const displayUsername = displayProfile?.username || null;
              const displayAvatar = displayProfile?.avatar_url || null;

              return (
                <div key={post.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors duration-300 shadow-sm dark:shadow-none">
                  
                  <div className="flex justify-between items-start mb-3">
                    <Link href={`/profile/${displayPost.user_id}`} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold transition-colors duration-300 mt-1 overflow-hidden shrink-0">
                        {displayAvatar ? <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" /> : (displayPost.author_name ? displayPost.author_name.charAt(0).toUpperCase() : "U")}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
                          {displayPost.author_name || "Anonymous Rebel"}
                          {displayVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {displayUsername && <span className="font-medium text-indigo-600 dark:text-indigo-400">@{displayUsername}</span>}
                          {displayUsername && <span>•</span>}
                          <span>{displayPost.created_at ? new Date(displayPost.created_at).toLocaleDateString() : "Just now"}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  {displayPost.content && <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{displayPost.content}</p>}
                  {displayPost.image_url && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/50">
                      <img src={displayPost.image_url} alt="Post attachment" className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-3">
                    <div className="flex items-center gap-6">
                      <button onClick={() => handleLike(displayPost.user_id, post.id, userHasLiked)} className={`flex items-center gap-1.5 text-sm transition-colors ${userHasLiked ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'}`}>
                        <Heart className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`} />
                        <span className="font-medium">{likeCount}</span>
                      </button>
                      <button onClick={() => { setActiveCommentPostId(isCommentsOpen ? null : post.id); setCommentText(""); }} className={`flex items-center gap-1.5 text-sm transition-colors ${isCommentsOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                        <MessageCircle className={`w-4 h-4 ${isCommentsOpen ? 'fill-current' : ''}`} />
                        <span className="font-medium">{commentCount}</span>
                      </button>
                      <button onClick={() => handleRepost(displayPost.user_id, post.id)} className="flex items-center gap-1.5 text-sm transition-colors text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
                        <Repeat className="w-4 h-4" />
                        <span className="hidden sm:inline">Repost</span>
                      </button>
                    </div>
                    
                    {/* INSTANT REMOVE BOOKMARK BUTTON */}
                    <button 
                      onClick={() => handleRemoveBookmark(post.id)} 
                      className="flex items-center gap-1.5 p-1.5 rounded-full transition-colors text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                      title="Remove from Vault"
                    >
                      <BookmarkIcon className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* COMMENTS SECTION */}
                  {isCommentsOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {post.comments?.length === 0 ? (
                          <p className="text-sm text-center text-slate-500 py-2">No comments yet.</p>
                        ) : (
                          post.comments?.map((comment: any) => {
                            let cProfile = comment.profiles;
                            if (Array.isArray(cProfile)) cProfile = cProfile[0];
                            return (
                              <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold overflow-hidden shrink-0 text-xs">
                                  {cProfile?.avatar_url ? <img src={cProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (cProfile?.full_name ? cProfile.full_name.charAt(0).toUpperCase() : "U")}
                                </div>
                                <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2.5">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-200">{cProfile?.full_name || "User"}</span>
                                    {cProfile?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                                  </div>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <form onSubmit={(e) => handleSubmitComment(e, displayPost.user_id, post.id)} className="flex gap-3 items-start">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold overflow-hidden shrink-0 mt-0.5">
                          {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (currentProfile?.full_name?.charAt(0).toUpperCase() || "U")}
                        </div>
                        <div className="flex-1 relative">
                          <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 pr-12 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors" />
                          <button type="submit" disabled={!commentText.trim() || isCommenting} className="absolute right-1.5 top-1.5 p-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-full disabled:opacity-50 transition-colors">
                            <Send className="w-3.5 h-3.5 -ml-0.5" />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}