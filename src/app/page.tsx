'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/chat');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wa-bg text-wa-textPrimary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-wa-teal border-t-transparent"></div>
          <p className="text-xs font-medium text-wa-textSecondary">Connecting to RealTalk...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-wa-bg text-wa-textPrimary font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-wa-sidebar border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="inline-flex p-5 bg-wa-teal/10 border border-wa-teal/20 rounded-full text-wa-teal shadow-inner">
          <MessageSquare className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-wa-textPrimary">RealTalk</h1>
          <p className="text-wa-textSecondary text-xs leading-relaxed">
            Real-Time 1-on-1 Chat Application built with Next.js & Appwrite.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/login"
            className="w-full py-3 px-4 bg-wa-teal hover:bg-wa-tealDark text-white font-semibold text-sm rounded-xl transition duration-200 shadow-lg shadow-wa-teal/20"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="w-full py-3 px-4 bg-wa-header hover:bg-slate-700/60 text-wa-textPrimary font-semibold text-sm rounded-xl border border-slate-700/60 transition duration-200"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
