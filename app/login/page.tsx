'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-gray-900 focus:outline-none';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === 'signup' && !data.session) {
      return setMsg('Check your email to confirm your account, then sign in.');
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className='mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center'>
      <h1 className='mb-1 text-2xl font-bold'>Macro Tracker</h1>
      <p className='mb-6 text-sm text-gray-600'>{mode === 'signin' ? 'Sign in to continue' : 'Create your account'}</p>
      <form onSubmit={submit} className='space-y-3'>
        <input className={inputCls} type='email' required placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type='password' required minLength={8} placeholder='Password (8+ characters)' value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <p className='text-sm text-red-600'>{msg}</p>}
        <button disabled={busy} className='w-full rounded-lg bg-gray-900 py-2.5 font-medium text-white disabled:opacity-50'>
          {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button className='mt-4 text-sm text-gray-600 underline' onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </div>
  );
}
