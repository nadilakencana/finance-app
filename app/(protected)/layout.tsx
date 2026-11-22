'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Memuat…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-28 md:gap-6 md:px-8 md:pt-8 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
