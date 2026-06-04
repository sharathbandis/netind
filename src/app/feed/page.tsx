"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, Home, Users, Bell, Search, Send, Settings, Heart, BadgeCheck, MessageCircle, Image as ImageIcon, X, Repeat, Trash2, Loader2, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Feed() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

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

      fetchPosts();
      fetchNotifications(session.user.id);
    };
    getUserAndPosts();
  }, [router]);

  useEffect(() => {
    const searchProfiles = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url, is_verified').or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`).limit(5);
      if (data) setSearchResults(data);
      setIsSearching(false);
    };
    const delayDebounceFn = setTimeout(() => { searchProfiles(); }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchPosts = async () => {
    // UPDATED QUERY: We are now fetching the bookmarks array attached to the post
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *, 
        likes(user_id), 
        bookmarks(user_id),
        profiles(is_verified, username, avatar_url, full_name),
        comments(*, profiles(username, avatar_url, full_name, is_verified))
      `)
      .order('created_at', { ascending: false });
      
    if (data) {
      const sortedData = data.map(post => ({
        ...post,
        comments: post.comments?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
      }));
      setPosts(sortedData);
    }
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select(`*, actor:profiles!notifications_actor_id_fkey(full_name, username, avatar_url, is_verified)`)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  const markNotificationsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !mediaFile) || !user) return;
    setIsPublishing(true);
    let imageUrl = null;

    try {
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('post_media').upload(fileName, mediaFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('post_media').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
      const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Anonymous Rebel";
      const { error } = await supabase.from('posts').insert([{ content: newPost, user_id: user.id, author_name: authorName, image_url: imageUrl }]);
      if (error) throw error;
      setNewPost("");
      removeMedia();
      fetchPosts();
    } catch (error: any) {
      alert("Error posting: " + error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePost = async (postId: number, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      if (imageUrl) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) await supabase.storage.from('post_media').remove([fileName]);
      }
      await supabase.from('posts').delete().eq('id', postId);
      fetchPosts();
    } catch (error: any) {
      alert("Error deleting post: " + error.message);
    }
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
    fetchPosts();
  };

  // THE NEW BOOKMARK LOGIC
  const handleBookmark = async (postId: number, hasBookmarked: boolean) => {
    if (!user) return;
    if (hasBookmarked) {
      await supabase.from('bookmarks').delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('bookmarks').insert([{ post_id: postId, user_id: user.id }]);
    }
    fetchPosts();
  };

  const handleSubmitComment = async (e: React.FormEvent, postAuthorId: string, postId: number) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setIsCommenting(true);
    const { error } = await supabase.from('comments').insert([{ content: commentText, user_id: user.id, post_id: postId }]);
    setIsCommenting(false);
    if (!error) { 
      setCommentText(""); 
      fetchPosts(); 
      if (postAuthorId !== user.id) {
        await supabase.from('notifications').insert([{ recipient_id: postAuthorId, actor_id: user.id, type: 'comment', post_id: postId }]);
      }
    } 
  };

  const handleRepost = async (postAuthorId: string, postId: number) => {
    if (!user) return;
    const hasReposted = posts.some(p => p.original_post_id === postId && p.user_id === user.id);
    if (hasReposted) { alert("You already reposted this!"); return; }
    
    const authorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Anonymous Rebel";
    const { error } = await supabase.from('posts').insert([{ user_id: user.id, author_name: authorName, original_post_id: postId, content: "" }]);
    
    if (!error) {
      fetchPosts();
      if (postAuthorId !== user.id) {
        await supabase.from('notifications').insert([{ recipient_id: postAuthorId, actor_id: user.id, type: 'repost', post_id: postId }]);
      }
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

        <div className="relative hidden md:flex items-center w-1/3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2 w-full transition-colors duration-300 focus-within:ring-2 focus-within:ring-indigo-500">
            <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="bg-transparent border-none focus:outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-500" />
            {isSearching && <Loader2 className="w-4 h-4 text-slate-400 animate-spin ml-2 shrink-0" />}
          </div>

          {searchQuery.trim() !== "" && (
            <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-50">
              {searchResults.length === 0 && !isSearching ? (
                <div className="p-4 text-center text-sm text-slate-500">No rebels found matching "{searchQuery}"</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <Link key={result.id} href={`/profile/${result.id}`} onClick={() => setSearchQuery("")} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0 overflow-hidden text-xs">
                        {result.avatar_url ? <img src={result.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (result.full_name ? result.full_name.charAt(0).toUpperCase() : "U")}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate">{result.full_name || "Unknown User"}</span>
                          {result.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        </div>
                        {result.username && <span className="text-xs text-slate-500 truncate">@{result.username}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button className="text-indigo-600 dark:text-indigo-400"><Home className="w-5 h-5 md:w-6 md:h-6" /></button>
          
          {/* THE NEW BOOKMARKS ICON IN NAVBAR */}
          <Link href="/bookmarks" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Bookmarks">
            <Bookmark className="w-5 h-5 md:w-6 md:h-6" />
          </Link>

          <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Users className="w-5 h-5 md:w-6 md:h-6" /></button>
          
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markNotificationsRead();
              }} 
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full mt-4 right-[-60px] md:right-0 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800/50">
                  <h3 className="font-bold text-sm">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">You're all caught up!</div>
                  ) : (
                    notifications.map(notif => {
                      const actor = notif.actor;
                      if (!actor) return null;
                      
                      let actionText = "";
                      let Icon = Bell;
                      let iconColor = "text-slate-500";
                      
                      if (notif.type === 'like') { actionText = "liked your post."; Icon = Heart; iconColor = "text-rose-500"; }
                      if (notif.type === 'comment') { actionText = "commented on your post."; Icon = MessageCircle; iconColor = "text-indigo-500"; }
                      if (notif.type === 'repost') { actionText = "reposted your post."; Icon = Repeat; iconColor = "text-green-500"; }

                      return (
                        <div key={notif.id} className={`flex items-start gap-3 p-3 border-b border-slate-50 dark:border-slate-800/30 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                          <Icon className={`w-4 h-4 mt-1 shrink-0 ${iconColor}`} />
                          <div>
                            <p className="text-sm text-slate-800 dark:text-slate-200">
                              <Link href={`/profile/${notif.actor_id}`} className="font-bold hover:underline">
                                {actor.full_name || "Someone"}
                              </Link>{" "}
                              {actionText}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{new Date(notif.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          {user && (
            <Link href={`/profile/${user.id}`} className="hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                {currentProfile?.avatar_url ? (
                  <img src={currentProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {currentProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
              </div>
            </Link>
          )}

          <button onClick={() => router.push('/settings')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2 md:ml-4 border-l border-slate-200 dark:border-slate-800 pl-4">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto mt-8 px-4 space-y-6 pb-12">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors duration-300 shadow-sm dark:shadow-none">
          <form onSubmit={handleCreatePost}>
            <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="What are you building? (No humblebrags or corporate jargon allowed)" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none min-h-[80px]" />
            
            {mediaPreview && (
              <div className="relative mt-3 inline-block">
                <img src={mediaPreview} alt="Preview" className="h-24 w-auto rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
                <button type="button" onClick={removeMedia} className="absolute -top-2 -right-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full p-1 hover:scale-110 transition-transform">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
              <label className="cursor-pointer p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Add Media</span>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={isPublishing} />
              </label>
              <button type="submit" disabled={isPublishing || (!newPost.trim() && !mediaFile)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                {isPublishing ? "Publishing..." : "Publish"}
                {!isPublishing && <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {posts.map((post) => {
            const userHasLiked = post.likes?.some((like: any) => like.user_id === user?.id);
            // NEW: Check if the current user has bookmarked this post
            const userHasBookmarked = post.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id);
            
            const likeCount = post.likes?.length || 0;
            const commentCount = post.comments?.length || 0;
            const isCommentsOpen = activeCommentPostId === post.id;
            const isMyPost = post.user_id === user?.id;

            let isRepost = false;
            let displayPost = post;
            let displayProfile = post.profiles;

            if (post.original_post_id) {
               isRepost = true;
               const localOriginal = posts.find(p => p.id === post.original_post_id);
               if (localOriginal) {
                 displayPost = localOriginal;
                 displayProfile = localOriginal.profiles;
               } else {
                 displayPost = { ...post, content: "[This original post was deleted]", image_url: null };
                 displayProfile = null;
               }
            }
            if (Array.isArray(displayProfile)) displayProfile = displayProfile[0];

            const displayVerified = displayProfile?.is_verified || false;
            const displayUsername = displayProfile?.username || null;
            const displayAvatar = displayProfile?.avatar_url || null;

            return (
              <div key={post.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors duration-300 shadow-sm dark:shadow-none">
                
                {isRepost && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-3 ml-2">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{post.author_name} reposted</span>
                  </div>
                )}

                <div className={isRepost ? "border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30" : ""}>
                  <div className="flex justify-between items-start mb-3">
                    <Link href={`/profile/${displayPost.user_id}`} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold transition-colors duration-300 mt-1 overflow-hidden shrink-0">
                        {displayAvatar ? <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" /> : (displayPost.author_name ? displayPost.author_name.charAt(0).toUpperCase() : "U")}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-1 text-slate-900 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
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

                    {isMyPost && (
                      <button onClick={() => handleDeletePost(post.id, post.image_url)} className="p-2 -mt-2 -mr-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 rounded-full transition-colors group">
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                  
                  {displayPost.content && <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{displayPost.content}</p>}
                  {displayPost.image_url && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/50">
                      <img src={displayPost.image_url} alt="Post attachment" className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  )}
                </div>
                
                {/* UPGRADED ENGAGEMENT BAR WITH BOOKMARK */}
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
                    {!isRepost && ( 
                      <button onClick={() => handleRepost(displayPost.user_id, post.id)} className="flex items-center gap-1.5 text-sm transition-colors text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
                        <Repeat className="w-4 h-4" />
                        <span className="hidden sm:inline">Repost</span>
                      </button>
                    )}
                  </div>
                  
                  {/* BOOKMARK BUTTON */}
                  <button onClick={() => handleBookmark(post.id, userHasBookmarked)} className={`p-1.5 rounded-full transition-colors ${userHasBookmarked ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}>
                    <Bookmark className={`w-4 h-4 ${userHasBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {isCommentsOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {post.comments?.length === 0 ? (
                        <p className="text-sm text-center text-slate-500 py-2">No comments yet. Be the first!</p>
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
          })}
        </div>
      </main>
    </div>
  );
}