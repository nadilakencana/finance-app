'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconArrows, IconCalendar, IconHome, IconMore, IconWallet } from './icons';

// Rekening & Emas tidak muat di 5 tab -> masuk ke halaman /more ("Lainnya")
const TABS = [
  { href: '/dashboard', label: 'Beranda', match: ['/dashboard'], Icon: IconHome },
  { href: '/pockets', label: 'Kantong', match: ['/pockets'], Icon: IconWallet },
  { href: '/transactions', label: 'Transaksi', match: ['/transactions'], Icon: IconArrows },
  { href: '/fixed-costs', label: 'Tagihan', match: ['/fixed-costs'], Icon: IconCalendar },
  { href: '/more', label: 'Lainnya', match: ['/more', '/accounts', '/gold-assets'], Icon: IconMore },
];

// Navigasi HP (< 768px). Di desktop diganti <Sidebar />.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface px-1 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      {TABS.map(({ href, label, match, Icon }) => {
        const active = match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-13 flex-col items-center justify-center gap-1 text-xs ${
              active ? 'font-bold text-brand' : 'font-medium text-muted'
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
