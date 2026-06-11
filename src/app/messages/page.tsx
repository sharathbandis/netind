"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Send, Loader2, BadgeCheck, MessageCircle, Search, Users } from "lucide-react";
import Link from "next/link";

export default function Messages() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Contacts & Chats
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Auto-scroller for chat window
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);
      await loadContacts(session.user.id);
      setIsLoading(false);
    };
    initApp();
  }, [router]);

  // Load the user's network (Followers & Following) to act as their Address Book
  const loadContacts = async (userId: string) => {
    const { data: follows } = await supabase
      .from('follows')
      .select(`
        follower_id, 
        following_id,
        follower:profiles!follows_follower_id_fkey(id, full_name, username, avatar_url, is_verified),
        following:profiles!follows_following_id_fkey(id, full_name, username, avatar_url, is_verified)
      `)
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

    if (follows) {
      const uniqueContacts = new Map();
      follows.forEach((f: any) => {
        // If I am the follower, the contact is the 'following' profile
        if (f.follower_id === userId && f.following) {
          uniqueContacts.set(f.following.id, f.following);
        }
        // If I am being followed, the contact is the 'follower' profile
        if (f.following_id === userId && f.follower) {
          uniqueContacts.set(f.follower.id, f.follower);
        }
      });
      setContacts(Array.from(uniqueContacts.values()));
    }
  };

  // Load specific chat history
  const loadChatHistory = async (contactId: string, currentUserId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .in('sender_id', [currentUserId, contactId])
      .in('receiver_id', [currentUserId, contactId])
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    scrollToBottom();
  };

  // Real-time listener for incoming messages
  useEffect(() => {
    if (!user || !activeChatUser) return;

    loadChatHistory(activeChatUser.id, user.id);

    const channel = supabase
      .channel('realtime_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}` 
      }, (payload) => {
        // Only append if the incoming message is from the person we are currently looking at
        if (payload.new.sender_id === activeChatUser.id) {
          setMessages(current => [...current, payload.new]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatUser, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChatUser) return;
    
    setIsSending(true);
    const messageText = newMessage;
    setNewMessage(""); // Optimistic clear

    // 1. Optimistic UI update (feels instant to the user)
    const optimisticMsg = {
      id: Math.random(),
      sender_id: user.id,
      receiver_id: activeChatUser.id,
      content: messageText,
      created_at: new Date().toISOString()
    };
    setMessages(current => [...current, optimisticMsg]);
    scrollToBottom();

    // 2. Database insert
    const { error } = await supabase.from('messages').insert([{
      sender_id: user.id,
      receiver_id: activeChatUser.id,
      content: messageText
    }]);

    if (error) {
      alert("Failed to send message.");
    }
    setIsSending(false);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 flex flex-col">
      
      {/* HEADER */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => router.push('/feed')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Messages</h1>
          <p className="text-xs text-slate-500">End-to-end private</p>
        </div>
      </nav>

      {/* DUAL PANE LAYOUT */}
      <main className="flex-1 max-w-6xl w-full mx-auto flex overflow-hidden h-[calc(100vh-64px)]">
        
        {/* LEFT PANE: Address Book (Hidden on mobile if a chat is active) */}
        <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 ${activeChatUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="Search contacts..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {contacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <Users className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p>No contacts found.</p>
                <p className="mt-1 text-xs">Follow someone to start messaging.</p>
              </div>
            ) : (
              contacts.map(contact => (
                <button 
                  key={contact.id} 
                  onClick={() => setActiveChatUser(contact)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/30 text-left ${activeChatUser?.id === contact.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                >
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0 overflow-hidden text-xs">
                    {contact.avatar_url ? <img src={contact.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (contact.full_name ? contact.full_name.charAt(0).toUpperCase() : "U")}
                  </div>
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate">{contact.full_name || "Unknown User"}</span>
                      {contact.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                    </div>
                    {contact.username && <span className="text-xs text-slate-500 truncate">@{contact.username}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE: The Chat Vault */}
        <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 ${!activeChatUser ? 'hidden md:flex' : 'flex'}`}>
          {!activeChatUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
              <MessageCircle className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
              <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Your Messages</h2>
              <p className="text-sm max-w-xs">Select a contact from your network to start an encrypted chat.</p>
            </div>
          ) : (
            <>
              {/* Active Chat Header */}
              <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveChatUser(null)} className="md:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0 overflow-hidden text-xs">
                  {activeChatUser.avatar_url ? <img src={activeChatUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (activeChatUser.full_name ? activeChatUser.full_name.charAt(0).toUpperCase() : "U")}
                </div>
                <div>
                  <Link href={`/profile/${activeChatUser.id}`} className="font-bold text-sm hover:underline flex items-center gap-1">
                    {activeChatUser.full_name}
                    {activeChatUser.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                  </Link>
                  <p className="text-xs text-slate-500">@{activeChatUser.username}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-8">
                    This is the beginning of your direct message history with @{activeChatUser.username}.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm'}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form onSubmit={handleSendMessage} className="relative flex items-center max-w-4xl mx-auto">
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Start typing..." 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || isSending} 
                    className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}