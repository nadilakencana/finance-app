import { useId } from 'react';

/**
 * Logo Kantong: saku hijau dengan jahitan membentuk huruf K, dan koin mint yang masuk.
 * `simple` membuang jahitan putus-putus, dipakai saat ukurannya di bawah ~48px.
 */
export function LogoMark({ size = 32, simple = false, className }: { size?: number; simple?: boolean; className?: string }) {
  const clip = useId();
  const stitch = { stroke: '#5FD3B8', strokeLinecap: 'round' as const, fill: 'none' };

  return (
    <svg
      viewBox="0 0 40 48"
      width={(size * 40) / 48}
      height={size}
      aria-hidden="true"
      className={className}
    >
      {/* Koin, sebagian tertutup saku */}
      <circle cx="20" cy="8" r="6.5" fill="#7ADBBE" />
      <circle cx="20" cy="8" r="4.4" fill="none" stroke="#4DB89A" strokeWidth="1" />

      <clipPath id={clip}>
        <path d="M5 11H35A3 3 0 0 1 38 14V36.5L20 46L2 36.5V14A3 3 0 0 1 5 11Z" />
      </clipPath>
      <path d="M5 11H35A3 3 0 0 1 38 14V36.5L20 46L2 36.5V14A3 3 0 0 1 5 11Z" fill="#0F6B5C" />

      <g clipPath={`url(#${clip})`}>
        {simple ? (
          <>
            <path d="M2 16.5H38" {...stitch} strokeWidth="2" />
            <path d="M12.5 16.5V33L28.5 17M12.5 48V36L17 31.5L32.5 47" {...stitch} strokeWidth="2.4" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M2 15.9H38" {...stitch} strokeWidth="0.9" strokeDasharray="2 1.4" />
            <path d="M2 17.7H38" {...stitch} strokeWidth="1" />
            <path d="M12.2 17.7V34L28.5 17.7M12.2 48V36.6L17 31.8L32.5 47.3" {...stitch} strokeWidth="1" strokeLinejoin="round" />
            <path d="M10.4 17.7V48M30.9 17.7L18.3 30.3L33.5 45.5" {...stitch} strokeWidth="0.9" strokeDasharray="2 1.4" strokeLinejoin="round" />
          </>
        )}
      </g>
    </svg>
  );
}
