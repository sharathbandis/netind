"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// We added MessageCircle for the comment icon!
import { LogOut, Home, Users, Bell, Search, Send, Settings, Heart, BadgeCheck, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Feed() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // NEW: Comment States
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    const getUserAndPosts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase.from('profiles').select('username, is_verified, avatar_url, full_name').eq('id', session.user.id).single();
      if (profileData) setCurrentProfile(profileData);

      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', session.user.id);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      fetchPosts();
    };
    getUserAndPosts();
  }, [router]);

  // UPGRADED QUERY: Notice we are now asking for `comments` and the profile info of the person who wrote the comment!
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *, 
        likes(user_id), 
        profiles(is_verified, username, avatar_url),
        comments(*, profiles(username, avatar_url, full_name, is_verified))
      `)
      .order('created_at', { ascending: false });
      
    if (data) {
      // Sort comments so the oldest is at the top (standard social media behavior)
      const sortedData = data.map(post => ({
        ...post,
        comments: post.comments?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
      }));
      setPosts(sortedData);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;
    setIsPublishing(true);
    const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Anonymous Rebel";
    const { error } = await supabase.from('posts').insert([{ content: newPost, user_id: user.id, author_name: authorName }]);
    setIsPublishing(false);
    if (!error) { setNewPost(""); fetchPosts(); } 
  };

  const handleLike = async (postId: number, hasLiked: boolean) => {
    if (!user) return;
    if (hasLiked) await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id });
    else await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
    fetchPosts();
  };

  // THE NEW COMMENT ENGINE
  const handleSubmitComment = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    
    setIsCommenting(true);
    const { error } = await supabase.from('comments').insert([
      { content: commentText, user_id: user.id, post_id: postId }
    ]);
    
    setIsCommenting(false);
    
    if (!error) {
      setCommentText(""); // Clear the input
      fetchPosts(); // Refresh the feed silently to show the new comment
    } else {
      alert("Error posting comment: " + error.message);
    }
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
            
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full border-4 border-white dark:border-slate-900 relative z-10 flex items-center justify-center mt-4 mb-3 transition-colors duration-300 overflow-hidden mx-auto">
              {currentProfile?.avatar_url ? (
                <img src={currentProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                  {currentProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
            
            <h2 className="text-lg font-bold text-slate-900 dark:text-white relative z-10 truncate flex items-center justify-center gap-1">
              {currentProfile?.full_name || user?.email?.split('@')[0] || "Netind User"}
              {currentProfile?.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500" title="Verified User" />}
            </h2>
            {currentProfile?.username && (
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 relative z-10 mb-1 text-center">
                @{currentProfile.username}
              </p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10 mb-4 text-center mt-1">Reclaiming the network.</p>
            
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between text-sm transition-colors duration-300">
              <span className="text-slate-500">Followers</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{followerCount}</span>
            </div>
            <div className="pt-2 flex justify-between text-sm transition-colors duration-300">
              <span className="text-slate-500">Following</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{followingCount}</span>
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
            {posts.map((post) => {
              const userHasLiked = post.likes?.some((like: any) => like.user_id === user?.id);
              const likeCount = post.likes?.length || 0;
              const commentCount = post.comments?.length || 0;
              const isVerified = post.profiles?.is_verified || false;
              const authorUsername = post.profiles?.username || null;
              const authorAvatar = post.profiles?.avatar_url || null;

              // Check if THIS specific post has its comment section open
              const isCommentsOpen = activeCommentPostId === post.id;

              return (
                <div key={post.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors duration-300 shadow-sm dark:shadow-none">
                  <Link href={`/profile/${post.user_id}`} className="flex items-start gap-3 mb-3 hover:opacity-80 transition-opacity w-fit">
                    
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold transition-colors duration-300 mt-1 overflow-hidden shrink-0">
                      {authorAvatar ? (
                        <img src={authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        post.author_name ? post.author_name.charAt(0).toUpperCase() : "U"
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
                        {post.author_name || "Anonymous Rebel"}
                        {isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" title="Verified User" />}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {authorUsername && <span className="font-medium text-indigo-600 dark:text-indigo-400">@{authorUsername}</span>}
                        {authorUsername && <span>•</span>}
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                  
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>
                  
                  {/* ENGAGEMENT BAR (Like & Comment Buttons) */}
                  <div className="flex items-center gap-6 border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-2">
                    <button onClick={() => handleLike(post.id, userHasLiked)} className={`flex items-center gap-1.5 text-sm transition-colors ${userHasLiked ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'}`}>
                      <Heart className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{likeCount}</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        // Toggle logic: If it's already open, close it. If it's closed, open it.
                        setActiveCommentPostId(isCommentsOpen ? null : post.id);
                        setCommentText(""); // Reset text when switching
                      }} 
                      className={`flex items-center gap-1.5 text-sm transition-colors ${isCommentsOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                    >
                      <MessageCircle className={`w-4 h-4 ${isCommentsOpen ? 'fill-current' : ''}`} />
                      <span className="font-medium">{commentCount}</span>
                    </button>
                  </div>

                  {/* SLIDE-DOWN COMMENT SECTION */}
                  {isCommentsOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      
                      {/* Existing Comments List */}
                      <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {post.comments?.length === 0 ? (
                          <p className="text-sm text-center text-slate-500 py-2">No comments yet. Be the first!</p>
                        ) : (
                          post.comments?.map((comment: any) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold overflow-hidden shrink-0 text-xs">
                                {comment.profiles?.avatar_url ? (
                                  <img src={comment.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  comment.profiles?.full_name ? comment.profiles.full_name.charAt(0).toUpperCase() : "U"
                                )}
                              </div>
                              <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl rounded-tl-none px-4 py-2.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-sm font-bold text-slate-900 dark:text-slate-200">
                                    {comment.profiles?.full_name || "User"}
                                  </span>
                                  {comment.profiles?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                                  {comment.profiles?.username && (
                                    <span className="text-xs text-slate-500 ml-1">@{comment.profiles.username}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* New Comment Input */}
                      <form onSubmit={(e) => handleSubmitComment(e, post.id)} className="flex gap-3 items-start">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold overflow-hidden shrink-0 mt-0.5">
                          {currentProfile?.avatar_url ? (
                            <img src={currentProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            currentProfile?.full_name?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={commentText} 
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..." 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 pr-12 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                          <button 
                            type="submit" 
                            disabled={!commentText.trim() || isCommenting}
                            className="absolute right-1.5 top-1.5 p-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-full disabled:opacity-50 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5 -ml-0.5" />
                          </button>
                        </div>
                      </form>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}