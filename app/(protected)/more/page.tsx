'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IconBank, IconChevronRight, IconGold, IconLogout } from '@/components/icons';

// Halaman "Lainnya" — khusus HP (di desktop semua menu sudah ada di sidebar)
export default function MorePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const items = [
    { href: '/accounts', label: 'Rekening', note: 'Rekening bank & e-wallet', Icon: IconBank },
    { href: '/gold-assets', label: 'Emas', note: 'Catatan pembelian emas', Icon: IconGold },
  ];

  return (
    <>
      <h1 className="font-display text-2xl font-medium">Lainnya</h1>

      <section aria-label="Akun" className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white">
        <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint font-display text-xl font-medium text-ink">
          {user?.email.charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-sm text-on-ink-muted">{user?.email}</span>
      </section>

      <ul className="flex flex-col rounded-2xl border border-line bg-surface px-4">
        {items.map(({ href, label, note, Icon }) => (
          <li key={href} className="border-b border-line-soft last:border-0">
            <Link href={href} className="flex min-h-15 items-center gap-3.5">
              <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-raised text-muted">
                <Icon />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-[13px] text-muted">{note}</span>
              </span>
              <IconChevronRight size={20} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          logout();
          router.replace('/login');
        }}
        className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-warn-strong bg-surface font-medium text-warn-dark"
      >
        <IconLogout size={20} />
        Keluar
      </button>
    </>
  );
}
