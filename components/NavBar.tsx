'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/food', label: 'Food' },
  { href: '/exercise', label: 'Exercise' },
  { href: '/profile', label: 'Profile' },
];

export default function NavBar() {
  const path = usePathname();
  const router = useRouter();
  if (path.startsWith('/login')) return null;

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className='sticky top-0 z-10 border-b bg-white'>
      <div className='mx-auto flex max-w-3xl items-center justify-between gap-2 overflow-x-auto px-3 py-2 sm:px-4'>
        {/* Brand Logo on the left */}
        <Link href='/' className='flex shrink-0 items-center'>
          <Image src='/logo.png' alt='Makros' width={112} height={28} priority />
        </Link>

        {/* Centered Navigation Links */}
        <div className='flex items-center justify-center gap-1 sm:gap-3'>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                path === l.href
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Sign out button on the right */}
        <button
          onClick={signOut}
          className='shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors'
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}