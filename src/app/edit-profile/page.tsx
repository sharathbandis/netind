"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, Save, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile States
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setWebsite(profile.website || "");
        setAvatarUrl(profile.avatar_url || "");
        setCoverUrl(profile.cover_url || "");
      }
      setIsLoading(false);
    };
    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          bio: bio,
          website: website,
        })
        .eq('id', user.id);

      if (error) throw error;
      alert("Profile updated successfully!");
      router.push(`/profile/${user.id}`); // Send them back to see their new profile
    } catch (error: any) {
      alert("Error saving profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, bucket: 'avatars' | 'profile_covers') => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      if (bucket === 'avatars') setIsUploadingAvatar(true);
      else setIsUploadingCover(true);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const updateField = bucket === 'avatars' ? { avatar_url: publicUrl } : { cover_url: publicUrl };
      const { error: updateError } = await supabase.from('profiles').update(updateField).eq('id', user.id);
      
      if (updateError) throw updateError;

      if (bucket === 'avatars') setAvatarUrl(publicUrl);
      else setCoverUrl(publicUrl);

    } catch (error: any) {
      alert("Error uploading image: " + error.message);
    } finally {
      setIsUploadingAvatar(false);
      setIsUploadingCover(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans pb-12 transition-colors duration-300">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Edit Profile</h1>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto mt-6 px-4">
        {/* Visual Editor (Banner + Avatar) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6 shadow-sm">
          {/* Cover Banner */}
          <div className="h-40 bg-slate-200 dark:bg-slate-800 relative group flex items-center justify-center">
            {coverUrl && <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10"></div>
            <label className="cursor-pointer z-20 bg-white/90 text-slate-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white transition-colors shadow-sm relative group-hover:scale-105">
              {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {coverUrl ? "Change Cover" : "Add Cover Photo"}
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile_covers')} className="hidden" disabled={isUploadingCover} />
            </label>
          </div>

          {/* Avatar Section */}
          <div className="px-6 pb-6 relative">
            <div className="absolute -top-12 w-24 h-24 bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800 shadow-sm group">
              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                {avatarUrl ? (
                   <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-400">{fullName?.charAt(0) || "U"}</div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                   <label className="cursor-pointer w-full h-full flex items-center justify-center">
                     {isUploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                     <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatars')} className="hidden" disabled={isUploadingAvatar} />
                   </label>
                </div>
              </div>
            </div>

            <div className="pt-16">
              <h2 className="font-bold text-xl">{fullName || "Your Name"}</h2>
              <p className="text-slate-500 text-sm">@{username || "username"}</p>
            </div>
          </div>
        </div>

        {/* Text Details Editor */}
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="johndoe" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none h-24" placeholder="Building the future..."></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Website</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" placeholder="https://yourstartup.com" />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}