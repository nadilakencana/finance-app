'use client';

/**
 * Alat bantu daftar yang dipakai semua modul: kotak cari, filter dropdown, pilihan "kelompokkan",
 * dan judul grup. Penyaringan dilakukan di browser karena backend sudah mengirim semua data milik user
 * (dan hanya milik user itu: setiap query backend dibatasi userId dari token).
 */
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { IconCheck, IconChevronDown, IconClose, IconFilter, IconSearch } from './icons';

/** Huruf kecil + tanpa aksen, supaya "Émas" cocok dengan "emas" */
export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** true kalau setiap kata di `query` muncul di salah satu field */
export function matchesQuery(query: string, ...fields: (string | number | null | undefined)[]) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(fields.filter((f) => f !== null && f !== undefined).join(' '));
  return words.every((w) => haystack.includes(w));
}

/** Kelompokkan item, urutan grup mengikuti `order` kalau ada, selain itu urutan kemunculan */
export function groupItems<T>(items: T[], keyOf: (item: T) => string, order?: string[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  const entries = [...map.entries()];
  if (order) entries.sort(([a], [b]) => rank(order, a) - rank(order, b));
  return entries;
}

function rank(order: string[], key: string) {
  const i = order.indexOf(key);
  return i === -1 ? order.length : i;
}

export type Option = { value: string; label: string };

/** Batas panjang kata kunci, supaya input tidak bisa dipakai untuk membebani browser */
const MAX_QUERY = 80;

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-[1_1_240px]">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
        <IconSearch size={16} />
      </span>
      <input
        type="search"
        value={value}
        maxLength={MAX_QUERY}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_QUERY))}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-surface pr-10 pl-10 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-brand focus:shadow-[0_0_0_4px_rgba(15,107,92,0.1)] md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hapus kata kunci"
          className="absolute inset-y-0 right-1 flex w-9 items-center justify-center text-muted hover:text-ink"
        >
          <IconClose size={16} />
        </button>
      )}
    </div>
  );
}

type Variant = 'chip' | 'sheet';
const VariantContext = createContext<Variant>('chip');

/**
 * Satu filter. Tampilannya mengikuti tempatnya:
 * - di baris chip (desktop): tombol "Label: Nilai" + menu pilihan tepat di bawahnya
 * - di bottom sheet (HP): judul + pilihan berbentuk pil yang bisa diketuk
 */
export function FilterSelect(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  icon?: React.ReactNode;
}) {
  const variant = useContext(VariantContext);
  return variant === 'sheet' ? <SheetOptions {...props} /> : <ChipMenu {...props} />;
}

function ChipMenu({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const active = value !== options[0]?.value;
  const current = options.find((o) => o.value === value)?.label ?? '—';

  // Tutup saat klik di luar atau tekan Esc
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  // Saat terbuka, fokus ke pilihan yang sedang aktif
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
  }, [open]);

  function toggle() {
    const rect = rootRef.current?.getBoundingClientRect();
    // Menu selebar ~260px: kalau chip dekat tepi kanan, menu dirapatkan ke kanan supaya tidak terpotong
    if (rect) setAlignRight(rect.left + 260 > window.innerWidth - 16);
    setOpen((o) => !o);
  }

  function onListKey(e: React.KeyboardEvent) {
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') items[Math.min(i + 1, items.length - 1)]?.focus();
    else if (e.key === 'ArrowUp') items[Math.max(i - 1, 0)]?.focus();
    else if (e.key === 'Home') items[0]?.focus();
    else if (e.key === 'End') items[items.length - 1]?.focus();
    else if (e.key === 'Escape') {
      setOpen(false);
      rootRef.current?.querySelector('button')?.focus();
    } else return;
    e.preventDefault();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex h-11 items-center gap-1.5 rounded-xl border pr-2.5 pl-3 text-sm transition-colors ${
          active || open ? 'border-brand/40 bg-brand-soft text-brand-dark' : 'border-line bg-surface text-ink hover:border-line-strong'
        }`}
      >
        {icon && <span className={active ? 'text-brand' : 'text-muted'}>{icon}</span>}
        <span className={active ? 'text-brand-dark/70' : 'text-muted'}>{label}</span>
        <span className="max-w-40 truncate font-medium">{current}</span>
        <IconChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          onKeyDown={onListKey}
          className={`anim-pop absolute top-full z-40 mt-2 flex max-h-80 w-max max-w-72 min-w-48 flex-col gap-0.5 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-[0_16px_32px_-12px_rgba(20,23,26,0.22)] ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-9 w-full items-center justify-between gap-4 rounded-lg px-3 text-left text-sm transition-colors outline-none focus-visible:bg-raised ${
                    selected ? 'font-medium text-brand-dark' : 'text-ink hover:bg-raised'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {selected && <IconCheck size={16} className="text-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SheetOptions({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  const long = options.length > 8;
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[15px] font-semibold">{label}</legend>
      <div className={`flex flex-wrap gap-2 ${long ? 'max-h-44 overflow-y-auto rounded-xl bg-raised p-2' : ''}`}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(o.value)}
              className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
                selected ? 'border-brand bg-brand-soft font-medium text-brand-dark' : 'border-line bg-surface text-ink'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Baris alat.
 * - Desktop: kotak cari + chip filter dalam satu baris
 * - HP: kotak cari + satu tombol "Filter" yang membuka bottom sheet berisi semua filter
 */
export function ListToolbar({
  search,
  children,
  shown,
  total,
  noun,
  active,
  onReset,
}: {
  search: React.ReactNode;
  children?: React.ReactNode;
  shown: number;
  total: number;
  noun: string;
  active: boolean;
  onReset: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {search}
        {children && (
          <>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              className={`relative flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium md:hidden ${
                active ? 'border-brand/40 bg-brand-soft text-brand-dark' : 'border-line bg-surface text-ink'
              }`}
            >
              <IconFilter size={16} />
              Filter
              {active && <span aria-label="ada filter aktif" className="size-2 rounded-full bg-brand" />}
            </button>
            <div className="hidden flex-wrap gap-2 md:flex">{children}</div>
          </>
        )}
      </div>
      <p aria-live="polite" className="flex items-center gap-2 text-[15px] text-muted">
        {active ? (
          <>
            <span>
              {shown} dari {total} {noun}
            </span>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={onReset} className="font-medium text-brand underline-offset-4 hover:underline">
              Reset filter
            </button>
          </>
        ) : (
          <span>
            {total} {noun}
          </span>
        )}
      </p>

      {sheetOpen && (
        <FilterSheet shown={shown} noun={noun} active={active} onReset={onReset} onClose={() => setSheetOpen(false)}>
          {children}
        </FilterSheet>
      )}
    </div>
  );
}

function FilterSheet({
  children,
  shown,
  noun,
  active,
  onReset,
  onClose,
}: {
  children: React.ReactNode;
  shown: number;
  noun: string;
  active: boolean;
  onReset: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label="Filter"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="anim-pop m-0 mt-auto flex max-h-[85dvh] w-full max-w-none flex-col rounded-t-3xl bg-surface p-0 text-ink backdrop:bg-ink/45 md:hidden"
    >
      <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" />
      <div className="flex items-center justify-between gap-2 px-5 pt-2 pb-2">
        <h2 className="text-xl font-semibold">Filter</h2>
        <button type="button" onClick={onClose} aria-label="Tutup" className="-mr-2 flex size-11 items-center justify-center text-muted">
          <IconClose size={20} />
        </button>
      </div>
      <div className="flex flex-col gap-6 overflow-y-auto px-5 pt-2 pb-6">
        <VariantContext.Provider value="sheet">{children}</VariantContext.Provider>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-line px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onReset}
          disabled={!active}
          className="min-h-12 rounded-xl border border-line-strong px-5 text-sm font-medium disabled:opacity-40"
        >
          Reset
        </button>
        <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-brand text-sm font-medium text-white">
          Tampilkan {shown} {noun}
        </button>
      </div>
    </dialog>
  );
}

/** Judul grup: nama, jumlah item, dan (opsional) subtotal di kanan */
export function GroupHeading({ title, count, aside }: { title: string; count: number; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
      <h3 className="flex min-w-0 items-baseline gap-2 text-base font-semibold text-ink md:text-lg">
        <span className="truncate">{title}</span>
        <span className="shrink-0 text-sm font-normal text-muted">{count}</span>
      </h3>
      {aside && <span className="shrink-0 text-[15px] font-semibold whitespace-nowrap text-ink-2 md:text-base">{aside}</span>}
    </div>
  );
}

/** Pesan saat filter tidak menemukan apa pun */
export function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-10 text-center">
      <p className="font-medium">Tidak ada yang cocok</p>
      <p className="text-sm text-muted">Coba kata kunci lain atau ubah filternya</p>
      <button type="button" onClick={onReset} className="mt-1 text-sm font-medium text-brand underline-offset-4 hover:underline">
        Reset filter
      </button>
    </div>
  );
}
