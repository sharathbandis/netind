"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, UserPlus, UserCheck, BadgeCheck, Link as LinkIcon, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;

  const [posts, setPosts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Your Original Network States
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
        .select('*, likes(user_id), profiles(is_verified, username, avatar_url, full_name)')
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
      
      setIsLoading(false);
    };

    if (profileId) fetchEverything();
  }, [profileId]);

  // YOUR ORIGINAL FOLLOW LOGIC
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
      
      // Send notification for following
      await supabase.from('notifications').insert([{ 
        recipient_id: profileId, 
        actor_id: currentUser.id, 
        type: 'follow' 
      }]);
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
        .select('*, likes(user_id), profiles(is_verified, username, avatar_url, full_name)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!profileData) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 text-xl font-bold dark:text-white">Profile not found.</div>;

  const displayName = profileData?.full_name || "Anonymous Rebel";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const isMyProfile = currentUser?.id === profileId;
  const joinDate = new Date(profileData?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans pb-12 transition-colors duration-300">
      
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/feed')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-1">
          {displayName}
          {profileData?.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
        </h1>
      </nav>

      <main className="max-w-2xl mx-auto">
        
        {/* NEW RICH PROFILE CARD */}
        <div className="bg-white dark:bg-slate-900 border-b border-x border-slate-200 dark:border-slate-800 rounded-b-xl overflow-hidden mb-6 shadow-sm">
          
          {/* Cover Banner */}
          <div className="h-32 md:h-48 bg-slate-200 dark:bg-slate-800 relative">
            {profileData.cover_url ? (
              <img src={profileData.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-80"></div>
            )}
          </div>

          <div className="px-4 pb-6">
            <div className="flex justify-between items-start">
              {/* Avatar (Overlapping Banner) */}
              <div className="-mt-12 md:-mt-16 relative z-10 w-24 h-24 md:w-32 md:h-32 bg-white dark:bg-slate-900 rounded-full p-1 border-2 border-slate-200 dark:border-slate-800">
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-slate-400">{displayInitial}</span>
                  )}
                </div>
              </div>

              {/* Action Button (Edit Profile OR Follow) */}
              <div className="mt-4">
                {isMyProfile ? (
                  <Link href="/edit-profile" className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Edit Profile
                  </Link>
                ) : (
                  <button 
                    onClick={handleToggleFollow}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                      isFollowing 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-red-50 hover:text-red-600 border border-slate-200 dark:border-slate-700' 
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    }`}
                  >
                    {isFollowing ? (
                      <><UserCheck className="w-4 h-4" /> Following</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Follow</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="mt-3">
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-1.5">
                {displayName}
                {profileData?.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
              </h1>
              {profileData?.username && (
                <p className="text-slate-500">@{profileData.username}</p>
              )}
            </div>

            {/* Bio */}
            {profileData.bio && (
              <div className="mt-4 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {profileData.bio}
              </div>
            )}

            {/* Metadata Links */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {profileData.website && (
                <div className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
                  <LinkIcon className="w-4 h-4" />
                  <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    {profileData.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Joined {joinDate}</span>
              </div>
            </div>

            {/* YOUR ORIGINAL NETWORK STATS RESTORED */}
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{posts.length}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Posts</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{followerCount}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Followers</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{followingCount}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Following</span>
              </div>
            </div>
          </div>
        </div>

        {/* User's Timeline */}
        <div className="space-y-4 px-2 md:px-0">
          <h2 className="font-bold text-lg mb-2">Posts</h2>
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
                  
                  {/* Added Author Header back to timeline */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                       {profileData.avatar_url ? (
                         <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                         <span className="font-bold text-slate-400">{displayInitial}</span>
                       )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{displayName}</h4>
                      <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>
                  
                  {/* Preserved Image Rendering if they have images */}
                  {post.image_url && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img src={post.image_url} alt="Post attachment" className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-2">
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