'use client';

import Link from 'next/link';
import { IconChevronLeft, IconClose, IconPlus } from './icons';

/** Class standar untuk <input>/<select>. text-base (16px) mencegah auto-zoom di iPhone. */
export const inputClass =
  'min-h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-base outline-none focus:border-brand';

export const primaryButton =
  'min-h-12 rounded-lg bg-brand px-4 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn-dark">
      {message}
    </p>
  );
}

export function Loading() {
  return <p className="text-muted">Memuat…</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">{children}</p>;
}

/**
 * Judul halaman. `backHref` -> tombol kembali (hanya di HP, mis. ke /more).
 * `onAdd` -> tombol + kecil di kanan (hanya di HP, karena di desktop form selalu terlihat).
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  onAdd,
  addLabel,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  onAdd?: () => void;
  addLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        {backHref && (
          <Link href={backHref} aria-label="Kembali" className="-ml-3 flex size-11 items-center justify-center md:hidden">
            <IconChevronLeft size={20} />
          </Link>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-medium md:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted md:text-base">{subtitle}</p>}
        </div>
      </div>
      {action}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel ?? 'Tambah'}
          className="flex size-11 items-center justify-center rounded-xl border border-line-strong bg-surface md:hidden"
        >
          <IconPlus />
        </button>
      )}
    </header>
  );
}

/**
 * Form yang tampil sebagai:
 * - HP: bottom sheet (muncul dari bawah, latar gelap) — hanya saat `open`
 * - Desktop: panel di samping list — selalu tampil kalau `desktopAlways`, selain itu hanya saat `open`
 */
export function FormPanel({
  title,
  open,
  desktopAlways = false,
  highlight = false,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  open: boolean;
  desktopAlways?: boolean;
  highlight?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  const mobile = open ? 'fixed inset-0 z-50 flex items-end bg-ink/45' : 'hidden';
  const desktop = open || desktopAlways ? 'md:static md:z-auto md:block md:bg-transparent' : 'md:hidden';

  return (
    <div className={`${mobile} ${desktop} md:flex-[1_1_300px]`} onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8 md:max-h-none md:rounded-2xl md:border md:p-6 ${
          highlight ? 'md:border-2 md:border-brand' : 'md:border-line'
        }`}
      >
        <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`flex size-11 items-center justify-center ${desktopAlways ? 'md:hidden' : ''}`}
          >
            <IconClose size={20} />
          </button>
        </div>
        {children}
      </form>
    </div>
  );
}

/** Tombol + bulat melayang di kanan bawah (khusus HP) */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-24 z-30 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_8px_24px_rgba(20,23,26,0.16)] md:hidden"
    >
      <IconPlus size={20} />
    </button>
  );
}
