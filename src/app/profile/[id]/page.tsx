"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, UserPlus, UserCheck, BadgeCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  const [posts, setPosts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // New Network States
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const fetchEverything = async () => {
      // 1. Get logged-in user
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      setCurrentUser(user || null);

      // 2. Get this profile's specific info
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (profile) setProfileData(profile);

      // 3. Fetch their posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, likes(user_id), profiles(is_verified, username)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (postsData) setPosts(postsData);

      // 4. Fetch Follow Stats
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);
        
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      // 5. Check if the current user is already following them
      if (user && user.id !== profileId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', profileId)
          .single();
          
        if (followData) setIsFollowing(true);
      }
    };

    if (profileId) fetchEverything();
  }, [profileId]);

  // THE NEW FOLLOW LOGIC
  const handleToggleFollow = async () => {
    if (!currentUser) return;

    if (isFollowing) {
      // Unfollow
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId);
      setIsFollowing(false);
      setFollowerCount(prev => prev - 1);
    } else {
      // Follow
      await supabase.from('follows').insert([
        { follower_id: currentUser.id, following_id: profileId }
      ]);
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  };

  const handleLike = async (postId: number, hasLiked: boolean) => {
    if (!currentUser) return;
    if (hasLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: currentUser.id });
    } else {
      await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
    }
    
    // Silent refresh of posts to update hearts
    const { data } = await supabase
        .from('posts')
        .select('*, likes(user_id), profiles(is_verified, username)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const displayName = profileData?.full_name || "Anonymous Rebel";
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/feed')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-1">
          {displayName}
          {profileData?.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
        </h1>
      </nav>

      <main className="max-w-2xl mx-auto mt-8 px-4 pb-12">
        
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8 mb-6 flex flex-col items-center text-center transition-colors duration-300 shadow-sm dark:shadow-none">
          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center mb-4 transition-colors duration-300">
            <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
              {displayInitial}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
            {displayName}
            {profileData?.is_verified && <BadgeCheck className="w-6 h-6 text-blue-500" />}
          </h2>
          
          {profileData?.username && (
            <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-1">@{profileData.username}</p>
          )}

          {/* Network Stats */}
          <div className="flex items-center gap-6 mt-4 mb-6">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{posts.length}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{followerCount}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Followers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{followingCount}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Following</span>
            </div>
          </div>

          {/* Follow Button (Only show if looking at someone else's profile) */}
          {currentUser && currentUser.id !== profileId && (
            <button 
              onClick={handleToggleFollow}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
                isFollowing 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Follow
                </>
              )}
            </button>
          )}
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