'use client';

import { useEffect, useState } from 'react';

/** Bulatkan ke atas ke angka "rapi" (1, 2, 2.5, 5, 10 × 10^n) untuk batas sumbu Y */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

/** Angka yang menghitung naik dari 0 saat pertama tampil (mati kalau user memilih kurangi gerakan) */
export function CountUp({
  value,
  duration = 1100,
  delay = 0,
  format = String,
}: {
  value: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now() + delay;
    let frame = requestAnimationFrame(function tick(now) {
      const t = reduce ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);
  return <>{format(shown)}</>;
}

/** Cincin progres (seperti kartu cuti di contoh desain) */
export function Ring({
  percent,
  size = 88,
  stroke = 8,
  track = 'text-line',
  delay = 0,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  track?: string;
  /** jeda animasi (ms), untuk efek berurutan antar cincin */
  delay?: number;
  children?: React.ReactNode;
}) {
  const p = Math.min(100, Math.max(0, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={track} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          className="anim-ring text-brand"
          style={{ '--ring-from': `${c}px`, animationDelay: `${delay}ms` } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export type Series = { label: string; values: number[]; stroke: string; dot: string; area?: boolean };

/** Grafik garis sederhana. Sentuh/arahkan kursor ke kolom bulan untuk melihat nilainya. */
export function LineChart({
  labels,
  series,
  height = 200,
  formatTick,
  formatValue,
  tooltipTitle,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  formatTick: (n: number) => string;
  formatValue: (n: number) => string;
  tooltipTitle: (i: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const W = 600;
  const H = 200;
  const xPct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const yPct = (v: number) => 100 - (v / max) * 100;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => t * max);
  const points = (values: number[]) => values.map((v, i) => `${(xPct(i) / 100) * W},${(yPct(v) / 100) * H}`).join(' ');
  const anchor = (i: number) => (i === 0 ? 'translate-x-0' : i === n - 1 ? '-translate-x-full' : '-translate-x-1/2');

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col justify-between text-right text-xs text-muted" style={{ height }} aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="-my-2 leading-4">
            {formatTick(t)}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t, i) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-line"
              style={{ top: `${(i / 4) * 100}%` }}
            />
          ))}
          {/* key: gambar ulang saat rentang bulan berubah */}
          <svg
            key={labels.join()}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="anim-draw absolute inset-0 h-full w-full overflow-visible"
          >
            {series.map((s) =>
              s.area ? (
                <polygon
                  key={`${s.label}-area`}
                  points={`0,${H} ${points(s.values)} ${W},${H}`}
                  fill="currentColor"
                  className={`${s.stroke} opacity-[0.08]`}
                />
              ) : null,
            )}
            {series.map((s) => (
              <polyline
                key={s.label}
                points={points(s.values)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={s.stroke}
              />
            ))}
          </svg>

          {hover !== null && (
            <>
              <div aria-hidden="true" className="absolute inset-y-0 border-l border-line-strong" style={{ left: `${xPct(hover)}%` }} />
              {series.map((s) => (
                <span
                  key={s.label}
                  aria-hidden="true"
                  className={`absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${s.dot}`}
                  style={{ left: `${xPct(hover)}%`, top: `${yPct(s.values[hover])}%` }}
                />
              ))}
              <div
                className={`pointer-events-none absolute top-0 z-10 flex flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[0_8px_24px_rgba(20,23,26,0.08)] ${anchor(hover)}`}
                style={{ left: `${xPct(hover)}%` }}
              >
                <span className="text-muted">{tooltipTitle(hover)}</span>
                {series.map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className={`size-2 rounded-full ${s.dot}`} />
                    {s.label}: <strong className="font-medium">{formatValue(s.values[hover])}</strong>
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Area sentuh per bulan */}
          <div className="absolute inset-0 flex">
            {labels.map((l, i) => (
              <button
                key={l + i}
                type="button"
                aria-label={`${tooltipTitle(i)}: ${series.map((s) => `${s.label} ${formatValue(s.values[i])}`).join(', ')}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => setHover(i)}
                className="h-full flex-1 focus-visible:outline-offset-[-2px]"
              />
            ))}
          </div>
        </div>
        <div className="relative h-4 text-xs text-muted" aria-hidden="true">
          {labels.map((l, i) => (
            <span key={l + i} className={`absolute ${anchor(i)}`} style={{ left: `${xPct(i)}%` }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Grafik batang vertikal. `highlight` = indeks batang yang diberi warna aksen. */
export function BarChart({
  labels,
  values,
  highlight,
  height = 160,
  formatValue,
  describe,
}: {
  labels: string[];
  values: number[];
  highlight?: number;
  height?: number;
  formatValue: (n: number) => string;
  describe: (i: number) => string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex items-end gap-2" style={{ height }}>
        {values.map((v, i) => (
          <li key={labels[i] + i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={describe(i)}>
            <span
              aria-hidden="true"
              className="anim-fade text-xs whitespace-nowrap text-muted"
              style={{ animationDelay: `${300 + i * 60}ms` }}
            >
              {v > 0 ? formatValue(v) : ''}
            </span>
            <span
              aria-hidden="true"
              className={`anim-grow w-full max-w-10 rounded-md ${i === highlight ? 'bg-brand' : 'bg-mint-soft'}`}
              style={{ height: `${Math.max(v > 0 ? 4 : 2, (v / max) * (height - 24))}px`, animationDelay: `${i * 60}ms` }}
            />
          </li>
        ))}
      </ul>
      <div className="flex gap-2 text-xs text-muted" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={l + i} className={`flex-1 text-center ${i === highlight ? 'font-medium text-ink' : ''}`}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
