'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  fetchAllUsers,
  fetchAllRecentMessages,
  fetchConversationMessages,
  sendChatMessage,
  subscribeToRealtimeMessages,
} from '@/lib/chat';
import { AppwriteUser, ChatMessage } from '@/lib/types';
import {
  LogOut,
  Send,
  MessageSquare,
  Menu,
  X,
  Search,
  UserCheck,
  Clock,
  AlertCircle,
  Check
} from 'lucide-react';

function getLastSeen(currentUserId: string, targetUserId: string): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(`realtalk_last_seen_${currentUserId}_${targetUserId}`);
  return stored ? parseInt(stored, 10) || 0 : 0;
}

function setLastSeen(currentUserId: string, targetUserId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`realtalk_last_seen_${currentUserId}_${targetUserId}`, Date.now().toString());
}

export default function ChatPage() {
  const { user, loading, logoutUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AppwriteUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppwriteUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedUserRef = useRef<AppwriteUser | null>(null);

  // Protected Route Check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Keep selectedUserRef synced and clear unread counts for active selected user
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (user && selectedUser) {
      setLastSeen(user.$id, selectedUser.userId);
      setUnreadCounts((prev) => {
        if (!prev[selectedUser.userId]) return prev;
        const next = { ...prev };
        delete next[selectedUser.userId];
        return next;
      });
    }
  }, [user, selectedUser]);

  // Load Registered Users and calculate initial unread counts right after login
  useEffect(() => {
    if (user) {
      fetchAllUsers().then((fetchedUsers) => {
        const otherUsers = fetchedUsers.filter((u) => u.userId !== user.$id);
        setUsers(otherUsers);
      });

      fetchAllRecentMessages().then((allMsgs) => {
        const counts: Record<string, number> = {};
        allMsgs.forEach((msg) => {
          if (msg.receiverId === user.$id) {
            const lastSeen = getLastSeen(user.$id, msg.senderId);
            const msgTime = new Date(msg.$createdAt).getTime();
            if (msgTime > lastSeen) {
              counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
            }
          }
        });
        setUnreadCounts(counts);
      });
    }
  }, [user]);

  // Load Messages when Selected User changes
  useEffect(() => {
    if (user && selectedUser) {
      setLoadingMessages(true);
      fetchConversationMessages(user.$id, selectedUser.userId)
        .then((msgs) => setMessages(msgs))
        .finally(() => setLoadingMessages(false));
    }
  }, [user, selectedUser]);

  // Subscribe to Realtime Messages
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToRealtimeMessages((incomingMsg) => {
      if (incomingMsg.receiverId === user.$id) {
        const activeSelected = selectedUserRef.current;
        if (activeSelected && activeSelected.userId === incomingMsg.senderId) {
          setLastSeen(user.$id, incomingMsg.senderId);
          setMessages((prev) => {
            if (prev.some((m) => m.$id === incomingMsg.$id)) return prev;
            return [...prev, incomingMsg];
          });
        } else {
          // Increment unread message count for unopened conversation
          setUnreadCounts((prev) => ({
            ...prev,
            [incomingMsg.senderId]: (prev[incomingMsg.senderId] || 0) + 1,
          }));
        }
      } else if (
        incomingMsg.senderId === user.$id &&
        selectedUserRef.current &&
        selectedUserRef.current.userId === incomingMsg.receiverId
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.$id === incomingMsg.$id)) {
            return prev.map((m) => (m.$id === incomingMsg.$id ? { ...incomingMsg, status: 'sent' } : m));
          }

          const pendingIndex = prev.findIndex(
            (m) =>
              m.$id.startsWith('temp-') ||
              (m.status === 'sending' && m.text === incomingMsg.text)
          );

          if (pendingIndex !== -1) {
            const next = [...prev];
            next[pendingIndex] = { ...incomingMsg, status: 'sent' };
            return next;
          }

          return [...prev, { ...incomingMsg, status: 'sent' }];
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: FormEvent, retryText?: string, tempIdToRetry?: string) => {
    if (e) e.preventDefault();
    const textToSend = retryText || newMessageText.trim();
    if (!textToSend || !user || !selectedUser) return;

    const tempId = tempIdToRetry || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (!tempIdToRetry) {
      setNewMessageText('');
      const tempMsg: ChatMessage = {
        $id: tempId,
        senderId: user.$id,
        receiverId: selectedUser.userId,
        senderName: user.name,
        text: textToSend,
        $createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((prev) => [...prev, tempMsg]);
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.$id === tempId ? { ...m, status: 'sending' } : m))
      );
    }

    try {
      const sentMsg = await sendChatMessage(
        user.$id,
        selectedUser.userId,
        user.name,
        textToSend
      );

      if (sentMsg) {
        setMessages((prev) => {
          const existsByRealId = prev.some((m) => m.$id === sentMsg.$id);
          const existsByTempId = prev.some((m) => m.$id === tempId);

          if (existsByRealId) {
            return prev
              .filter((m) => m.$id !== tempId)
              .map((m) => (m.$id === sentMsg.$id ? { ...sentMsg, status: 'sent' } : m));
          }

          if (existsByTempId) {
            return prev.map((m) => (m.$id === tempId ? { ...sentMsg, status: 'sent' } : m));
          }

          const pendingIndex = prev.findIndex(
            (m) => m.$id.startsWith('temp-') || (m.status === 'sending' && m.text === textToSend)
          );

          if (pendingIndex !== -1) {
            const next = [...prev];
            next[pendingIndex] = { ...sentMsg, status: 'sent' };
            return next;
          }

          return [...prev, { ...sentMsg, status: 'sent' }];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => {
          if ((m.$id === tempId || m.$id.startsWith('temp-')) && m.status === 'sending') {
            return { ...m, status: 'error' };
          }
          return m;
        })
      );
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto open mobile menu on small screens when no contact is selected
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && !selectedUser) {
      setMobileMenuOpen(true);
    }
  }, [selectedUser]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wa-bg text-wa-textPrimary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-wa-teal border-t-transparent"></div>
          <p className="text-sm text-wa-textSecondary font-medium">Opening RealTalk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen h-[100dvh] bg-wa-bg text-wa-textPrimary font-sans overflow-hidden relative">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } fixed md:relative z-30 inset-y-0 left-0 w-80 lg:w-96 bg-wa-sidebar border-r border-slate-800/60 flex flex-col transition-transform duration-200 ease-in-out h-full`}
      >
        {/* Top Profile Header */}
        <div className="h-16 px-4 bg-wa-header flex items-center justify-between border-b border-slate-800/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-wa-tealDark flex items-center justify-center text-white font-semibold shadow-sm shrink-0">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <h2 className="font-semibold text-sm text-wa-textPrimary truncate">{user.name || 'My Account'}</h2>
              <p className="text-xs text-wa-textSecondary truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-wa-textSecondary shrink-0">
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 hover:text-rose-400 hover:bg-slate-700/50 rounded-full transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 hover:text-white hover:bg-slate-700/50 rounded-full transition"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2 bg-wa-sidebar border-b border-slate-800/60 shrink-0">
          <div className="relative flex items-center bg-wa-header rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-wa-textSecondary shrink-0 mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts"
              className="w-full bg-transparent text-sm text-wa-textPrimary placeholder-wa-textSecondary focus:outline-none"
            />
          </div>
        </div>

        {/* User Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-wa-textSecondary space-y-1">
              <UserCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No contacts found</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUser?.userId === u.userId;
              const unreadCount = unreadCounts[u.userId] || 0;

              return (
                <button
                  key={u.$id}
                  onClick={() => {
                    setSelectedUser(u);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-800/40 transition text-left ${
                    isSelected ? 'bg-wa-header' : 'hover:bg-wa-header/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-base shadow-inner">
                      {u.name ? u.name[0].toUpperCase() : 'U'}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-semibold text-sm text-wa-textPrimary truncate">{u.name || u.email}</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-wa-teal text-white rounded-full min-w-[20px] text-center shrink-0 shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-wa-textSecondary truncate">{u.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Window */}
      <main className="flex-1 flex flex-col h-full bg-wa-bg relative min-w-0">
        {/* Chat Header */}
        <header className="h-16 px-4 bg-wa-header border-b border-slate-800/60 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-wa-sidebar hover:bg-slate-700/60 text-wa-teal rounded-lg border border-slate-700/50 text-xs font-semibold shadow-sm shrink-0"
              title="Open Contacts Menu"
            >
              <Menu className="w-4 h-4" />
              <span>Contacts</span>
            </button>

            {selectedUser ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {selectedUser.name ? selectedUser.name[0].toUpperCase() : 'U'}
                </div>
                <div className="truncate">
                  <h3 className="font-semibold text-sm text-wa-textPrimary truncate">{selectedUser.name}</h3>
                  <p className="text-xs text-wa-textSecondary truncate">{selectedUser.email}</p>
                </div>
              </div>
            ) : (
              <h3 className="font-semibold text-sm text-wa-textSecondary hidden sm:block">RealTalk</h3>
            )}
          </div>
        </header>

        {/* Chat Wallpaper Feed */}
        <div className="flex-1 overflow-y-auto wa-chat-pattern p-4 sm:p-6 space-y-3">
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-wa-textSecondary space-y-4 p-4 text-center">
              <div className="p-6 rounded-full bg-wa-header border border-slate-800 text-wa-teal">
                <MessageSquare className="w-16 h-16 stroke-1" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl font-light text-wa-textPrimary">RealTalk</h2>
                <p className="text-xs text-wa-textSecondary max-w-sm">
                  Send and receive messages in real-time. Select a contact from the left sidebar to begin.
                </p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden mt-2 px-5 py-2.5 bg-wa-teal hover:bg-wa-tealDark text-white text-xs font-semibold rounded-full shadow-md flex items-center gap-2"
              >
                <Menu className="w-4 h-4" />
                Select a Contact
              </button>
            </div>
          ) : loadingMessages ? (
            <div className="h-full flex items-center justify-center text-wa-textSecondary text-xs">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-wa-teal border-t-transparent"></div>
                Loading chat messages...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-wa-textSecondary">
              <div className="bg-wa-header px-4 py-2 rounded-lg text-xs border border-slate-800 text-wa-teal font-medium">
                🔒 Real-time 1-on-1 chat powered by Appwrite. Say hello!
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user.$id;
              const formattedTime = msg.$createdAt
                ? new Date(msg.$createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={msg.$id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-md px-3.5 py-2 rounded-lg text-sm shadow-md transition-all ${
                      isMine
                        ? msg.status === 'error'
                          ? 'bg-rose-950/40 text-wa-textPrimary rounded-tr-none border border-rose-500/50'
                          : 'bg-wa-bubbleOut text-wa-textPrimary rounded-tr-none'
                        : 'bg-wa-bubbleIn text-wa-textPrimary rounded-tl-none border border-slate-800/40'
                    }`}
                  >
                    {!isMine && (
                      <p className="text-[11px] font-semibold text-wa-teal mb-0.5">
                        {msg.senderName}
                      </p>
                    )}
                    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                      <p className="leading-relaxed break-words text-sm flex-1 min-w-[60px]">{msg.text}</p>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 select-none ml-auto shrink-0 pt-0.5">
                        <span>{formattedTime}</span>
                        {isMine && (
                          <>
                            {msg.status === 'sending' && (
                              <span title="Sending...">
                                <Clock className="w-3 h-3 animate-spin text-slate-400" />
                              </span>
                            )}
                            {msg.status === 'error' && (
                              <button
                                type="button"
                                onClick={() => handleSendMessage(undefined, msg.text, msg.$id)}
                                className="flex items-center gap-1 text-rose-300 hover:text-rose-100 font-semibold bg-rose-500/30 hover:bg-rose-500/50 px-2 py-0.5 rounded transition shadow-sm ml-1 cursor-pointer"
                                title="Failed to send. Click to retry."
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Retry</span>
                              </button>
                            )}
                            {msg.status === 'sent' && (
                              <span title="Sent">
                                <Check className="w-3 h-3 text-wa-teal" />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Bar */}
        {selectedUser && (
          <form
            onSubmit={handleSendMessage}
            className="h-16 px-4 bg-wa-header border-t border-slate-800/60 flex items-center gap-3 z-10 shrink-0"
          >
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type a message"
              className="flex-1 px-4 py-2.5 bg-wa-input border border-slate-700/40 rounded-lg text-wa-textPrimary placeholder-wa-textSecondary text-sm focus:outline-none focus:border-wa-teal transition"
            />

            <button
              type="submit"
              disabled={!newMessageText.trim() || sending}
              className="h-10 w-10 bg-wa-teal hover:bg-wa-tealDark disabled:opacity-40 text-white rounded-full flex items-center justify-center transition shrink-0 shadow-md"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
