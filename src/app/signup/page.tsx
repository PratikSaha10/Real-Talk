'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, User, Lock, Mail } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/chat');
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signup(email, password, name);
      await refreshUser();
      router.push('/chat');
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Password must be at least 8 characters.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-wa-bg text-wa-textPrimary font-sans">
      <div className="w-full max-w-md bg-wa-sidebar border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-wa-teal/10 rounded-full text-wa-teal border border-wa-teal/20">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-wa-textPrimary">Create Account</h1>
          <p className="text-xs text-wa-textSecondary">Join RealTalk in seconds</p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-wa-textSecondary uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-wa-textSecondary absolute left-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 bg-wa-input border border-slate-700/60 rounded-xl text-wa-textPrimary placeholder-wa-textSecondary focus:outline-none focus:border-wa-teal transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-wa-textSecondary uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-wa-textSecondary absolute left-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-4 py-3 bg-wa-input border border-slate-700/60 rounded-xl text-wa-textPrimary placeholder-wa-textSecondary focus:outline-none focus:border-wa-teal transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-wa-textSecondary uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-wa-textSecondary absolute left-3.5" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full pl-10 pr-4 py-3 bg-wa-input border border-slate-700/60 rounded-xl text-wa-textPrimary placeholder-wa-textSecondary focus:outline-none focus:border-wa-teal transition text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-wa-teal hover:bg-wa-tealDark disabled:opacity-50 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-wa-teal/20 text-sm"
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-wa-textSecondary">
          Already have an account?{' '}
          <Link href="/login" className="text-wa-teal hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
