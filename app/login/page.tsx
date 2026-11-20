'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IconEye, IconEyeOff } from '@/components/icons';

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

  const input =
    'min-h-12 text-base rounded-lg border border-[#cbd0ca] bg-surface px-3.5 outline-none focus:border-brand';

  return (
    <div className="flex min-h-screen flex-wrap">
      {/* Panel kiri: branding */}
      <section className="flex flex-[1_1_380px] flex-col justify-between gap-10 bg-ink p-8 text-white md:p-16">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-mint font-display text-xl font-bold text-ink">K</div>
          <span className="font-display text-[22px] font-bold">Kantong</span>
        </div>
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Pisahkan uangmu ke kantong, bukan ke spreadsheet.
          </h1>
          <p className="text-lg leading-relaxed text-[#b9c0c6]">
            Catat pemasukan, isi kantong budget, pantau tagihan rutin dan tabungan emas di satu tempat.
          </p>
        </div>
        <div />
      </section>

      {/* Panel kanan: form */}
      <main className="flex flex-[1_1_420px] items-center justify-center p-8 md:p-16">
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-5">
          <div className="flex gap-1 rounded-xl bg-[#e9ebe6] p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`min-h-11 flex-1 rounded-[9px] font-semibold ${mode === m ? 'bg-surface' : ''}`}
              >
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          <h2 className="font-display text-[28px] font-bold">
            {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
          </h2>

          {mode === 'register' && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Nama
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email
            <input type="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-semibold">
            <label htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={`${input} w-full pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
              >
                {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn-dark">
              {error}
            </p>
          )}

          <button
            disabled={submitting}
            className="min-h-12 rounded-lg bg-brand font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>
      </main>
    </div>
  );
}
