'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IconEye, IconEyeOff } from '@/components/icons';
import { LogoMark } from '@/components/logo';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
  }

  const input =
    'min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted/60 focus:border-brand focus:shadow-[0_0_0_4px_rgba(15,107,92,0.12)]';

  return (
    <div className="grid min-h-screen gap-3 bg-canvas p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:p-4">
      {/* Panel kiri: brand + gambaran isi aplikasi */}
      <section className="relative flex flex-col gap-8 overflow-hidden rounded-3xl bg-brand p-6 text-white md:p-10 lg:justify-between xl:p-14">
        {/* Jahitan saku, sama seperti di logo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[18px] border-[1.5px] border-dashed border-mint/35" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-mint/10" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)]">
            <LogoMark size={30} simple />
          </span>
          <span className="text-xl font-semibold">Kantong</span>
        </div>

        <div className="relative flex max-w-lg flex-col gap-4">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl md:leading-[1.1]">
            Pisahkan uangmu ke kantong, bukan ke spreadsheet
          </h1>
          <p className="text-base leading-relaxed text-white/75 md:text-lg">
            Catat pemasukan, isi kantong budget, pantau tagihan rutin dan tabungan emas di satu tempat
          </p>
        </div>

        <PocketStack />
      </section>

      {/* Panel kanan: form */}
      <main className="flex items-center justify-center px-3 py-10 md:px-8">
        <form onSubmit={handleSubmit} className="anim-pop flex w-full max-w-sm flex-col gap-6" key={mode}>
          <div className="flex flex-col gap-2">
            <h2 className="text-[28px] leading-tight font-semibold tracking-tight">
              {mode === 'login' ? 'Masuk ke Kantong' : 'Buat akun baru'}
            </h2>
            <p className="text-sm text-muted">
              {mode === 'login' ? 'Lanjutkan mencatat keuanganmu' : 'Gratis, cukup nama, email, dan password'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Nama
                <input
                  required
                  autoComplete="name"
                  placeholder="Nama lengkap"
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                className={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              <label htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Password kamu' : 'Minimal 6 karakter'}
                  className={`${input} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-ink"
                >
                  {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-dark">
              {error}
            </p>
          )}

          <button
            disabled={submitting}
            className="min-h-12 rounded-xl bg-brand font-medium text-white shadow-[0_8px_20px_-8px_rgba(15,107,92,0.6)] transition-[background-color,transform] hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Buat akun'}
          </button>

          <p className="text-center text-sm text-muted">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button type="button" onClick={switchMode} className="font-medium text-brand underline-offset-4 hover:underline">
              {mode === 'login' ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

/** Tumpukan kartu kantong: contoh isi aplikasi, hanya tampil di layar lebar */
function PocketStack() {
  return (
    <div aria-hidden="true" className="relative hidden h-64 w-full max-w-md lg:block">
      <div className="absolute top-0 left-6 w-72 -rotate-6 rounded-2xl bg-mint-soft p-5 text-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]">
        <MiniPocket name="Liburan Bali" amount="Rp 3.150.000" target="Rp 7.000.000" percent={45} />
      </div>
      <div className="absolute top-10 left-28 w-72 rotate-3 rounded-2xl bg-white p-5 text-ink shadow-[0_24px_48px_-20px_rgba(0,0,0,0.5)]">
        <MiniPocket name="Dana darurat" amount="Rp 8.400.000" target="Rp 12.000.000" percent={70} />
      </div>
      <div className="absolute top-36 left-0 flex w-60 items-center gap-3 rounded-2xl bg-ink/90 p-4 text-white shadow-[0_24px_48px_-20px_rgba(0,0,0,0.6)]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fbf4e4] text-sm font-semibold text-[#8a6413]">Au</span>
        <div className="flex flex-col">
          <span className="text-xs text-white/60">Tabungan emas · 12,5 g</span>
          <span className="text-sm font-semibold text-mint">+Rp 2.140.000</span>
        </div>
      </div>
    </div>
  );
}

function MiniPocket({ name, amount, target, percent }: { name: string; amount: string; target: string; percent: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted">{percent}%</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xl font-semibold">{amount}</span>
        <span className="text-xs text-muted">dari {target}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
