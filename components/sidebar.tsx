'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IconArrows, IconBank, IconCalendar, IconDashboard, IconGold, IconLogout, IconWallet } from './icons';

const MENU = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/accounts', label: 'Rekening', Icon: IconBank },
  { href: '/pockets', label: 'Kantong', Icon: IconWallet },
  { href: '/transactions', label: 'Transaksi', Icon: IconArrows },
  { href: '/fixed-costs', label: 'Tagihan Rutin', Icon: IconCalendar },
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
    <nav aria-label="Menu utama" className="hidden flex-[1_1_220px] flex-col gap-7 bg-ink px-4 py-6 text-[#e8eae6] md:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex size-8 items-center justify-center rounded-[9px] bg-mint font-display text-lg font-bold text-ink">K</div>
        <span className="font-display text-xl font-bold">Kantong</span>
      </div>

      <ul className="flex flex-col gap-1">
        {MENU.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] ${
                  active ? 'bg-ink-2 font-semibold text-white' : 'text-[#b9c0c6] hover:text-white'
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2 border-t border-[#2e343a] px-2 pt-4">
        <span className="text-[13px] text-[#9aa3ab]">Masuk sebagai</span>
        <span className="truncate text-sm font-semibold">{user?.email}</span>
        <button onClick={handleLogout} className="flex min-h-11 items-center gap-2.5 text-left text-sm text-[#b9c0c6] hover:text-white">
          <IconLogout size={18} />
          Keluar
        </button>
      </div>
    </nav>
  );
}
