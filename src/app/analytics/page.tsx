"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, Heart, MessageCircle, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Analytics() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Top-level Stats
  const [stats, setStats] = useState({
    totalFollowers: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0
  });

  // Chart Data
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      const currentUser = session.user;
      setUser(currentUser);

      // 1. Fetch Total Followers
      const { data: followers } = await supabase
        .from('follows')
        .select('created_at')
        .eq('following_id', currentUser.id);

      // 2. Fetch User's Posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, created_at')
        .eq('user_id', currentUser.id);

      const postIds = posts ? posts.map(p => p.id) : [];

      // 3. Fetch Engagement (Likes & Comments on user's posts)
      let likes: any[] = [];
      let comments: any[] = [];

      if (postIds.length > 0) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('created_at')
          .in('post_id', postIds);
        if (likesData) likes = likesData;

        const { data: commentsData } = await supabase
          .from('comments')
          .select('created_at')
          .in('post_id', postIds);
        if (commentsData) comments = commentsData;
      }

      setStats({
        totalFollowers: followers?.length || 0,
        totalPosts: posts?.length || 0,
        totalLikes: likes.length,
        totalComments: comments.length
      });

      // 4. Generate 7-Day Historical Data for Charts
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          dateObj: d,
          name: d.toLocaleDateString('en-US', { weekday: 'short' }), // e.g., "Mon"
          fullDate: d.toISOString().split('T')[0] // "YYYY-MM-DD"
        };
      });

      const processedGrowth = last7Days.map(day => {
        const newFollowers = followers?.filter(f => f.created_at.startsWith(day.fullDate)).length || 0;
        return { name: day.name, "New Followers": newFollowers };
      });

      const processedEngagement = last7Days.map(day => {
        const newLikes = likes.filter(l => l.created_at.startsWith(day.fullDate)).length;
        const newComments = comments.filter(c => c.created_at.startsWith(day.fullDate)).length;
        return { name: day.name, Likes: newLikes, Comments: newComments };
      });

      setGrowthData(processedGrowth);
      setEngagementData(processedEngagement);
      setIsLoading(false);
    };

    fetchAnalytics();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="font-medium text-slate-500">Crunching the numbers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans pb-12 transition-colors duration-300">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center gap-4 transition-colors duration-300">
        <button onClick={() => router.push('/feed')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-500" />
          Creator Analytics
        </h1>
      </nav>

      <main className="max-w-5xl mx-auto mt-8 px-4 space-y-8">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Followers</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalFollowers}</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Likes</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalLikes}</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Comments</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalComments}</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Posts</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalPosts}</p>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Follower Growth Chart */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              Follower Growth <span className="text-xs font-normal px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">Last 7 Days</span>
            </h2>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Line type="monotone" dataKey="New Followers" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              Engagement <span className="text-xs font-normal px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">Last 7 Days</span>
            </h2>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    cursor={{ fill: '#334155', opacity: 0.1 }}
                  />
                  <Bar dataKey="Likes" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Comments" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}