'use client';

/**
 * Pengganti confirm()/alert() bawaan browser:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Hapus kantong?', message: '...' }))) return;
 *
 *   const toast = useToast();
 *   toast('Kantong dihapus');                 // sukses
 *   toast('Gagal menghapus', 'error');        // gagal
 *
 * Modal memakai <dialog> bawaan (fokus terkunci di dalam, tombol Esc = batal).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { IconCheck, IconClose, IconTrash } from './icons';

type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = tombol merah-oranye untuk aksi menghapus */
  tone?: 'danger' | 'default';
};
type ToastTone = 'success' | 'error';
type Toast = { id: number; message: string; tone: ToastTone };

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);
const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm harus dipakai di dalam <FeedbackProvider>');
  return ctx;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <FeedbackProvider>');
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ options, resolve });
      }),
    [],
  );

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]); // maksimal 3 sekaligus
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  function close(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}
        {pending && <ConfirmDialog options={pending.options} onClose={close} />}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { title, message, confirmLabel = 'Hapus', cancelLabel = 'Batal', tone = 'danger' } = options;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // Fokus awal di tombol konfirmasi: Enter = ya, Esc = batal
    confirmRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby={message ? 'confirm-message' : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      onClick={(e) => {
        // Klik di area gelap di luar kartu = batal
        if (e.target === e.currentTarget) onClose(false);
      }}
      className="anim-pop m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_48px_rgba(20,23,26,0.18)] backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col items-start gap-4">
          <span
            aria-hidden="true"
            className={`flex size-11 items-center justify-center rounded-xl ${tone === 'danger' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand'}`}
          >
            {tone === 'danger' ? <IconTrash size={20} /> : <IconCheck size={20} />}
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 id="confirm-title" className="text-lg font-semibold">
              {title}
            </h2>
            {message && (
              <div id="confirm-message" className="text-sm leading-relaxed text-muted">
                {message}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="min-h-11 rounded-lg border border-line-strong bg-surface text-sm font-medium transition-colors hover:bg-raised"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={`min-h-11 rounded-lg text-sm font-medium text-white transition-colors ${
              tone === 'danger' ? 'bg-warn hover:bg-warn-dark' : 'bg-brand hover:bg-brand-dark'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    // HP: di atas bottom nav; desktop: kanan bawah
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-60 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="anim-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-surface py-3 pr-2 pl-3 shadow-[0_12px_32px_rgba(20,23,26,0.14)]"
        >
          <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${t.tone === 'error' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand'}`}
          >
            {t.tone === 'error' ? <IconClose size={16} /> : <IconCheck size={16} />}
          </span>
          <span className="min-w-0 flex-1 text-sm">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <IconClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
