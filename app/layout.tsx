import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Macro Tracker',
  description: 'Personal macro and energy tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <NavBar />
        <main className='mx-auto max-w-3xl px-3 py-4 sm:px-4'>{children}</main>
      </body>
    </html>
  );
}
