'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LogoMark } from './logo';
import { IconArrows, IconBank, IconCalendar, IconDashboard, IconGold, IconLogout, IconWallet } from './icons';

const MENU = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/accounts', label: 'Rekening', Icon: IconBank },
  { href: '/pockets', label: 'Kantong', Icon: IconWallet },
  { href: '/transactions', label: 'Transaksi', Icon: IconArrows },
  { href: '/fixed-costs', label: 'Tagihan rutin', Icon: IconCalendar },
  { href: '/gold-assets', label: 'Emas', Icon: IconGold },
];

// Navigasi desktop (>= 768px). Di HP diganti <BottomNav />.
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <nav
      aria-label="Menu utama"
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r border-line bg-surface px-4 py-6 md:flex"
    >
      <div className="flex items-center gap-2.5 px-3">
        <LogoMark size={32} simple />
        <span className="font-display text-xl font-semibold text-brand">Kantong</span>
      </div>

      <ul className="flex flex-col gap-1">
        {MENU.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${
                  active ? 'bg-brand font-medium text-white' : 'text-muted hover:bg-raised hover:text-ink'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-1 rounded-xl bg-brand-soft p-4">
        <span className="text-xs text-brand-dark">Masuk sebagai</span>
        <span className="truncate text-sm font-medium">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="mt-2 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-surface text-sm font-medium text-warn-dark transition-colors hover:bg-warn-soft"
        >
          <IconLogout size={16} />
          Keluar
        </button>
      </div>
    </nav>
  );
}
