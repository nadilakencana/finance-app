import type { NextConfig } from 'next';

// Header keamanan untuk semua halaman:
// - X-Frame-Options / frame-ancestors: halaman tidak bisa disisipkan di <iframe> situs lain (cegah clickjacking)
// - nosniff: browser tidak menebak tipe file
// - Referrer-Policy: URL lengkap tidak bocor ke situs lain
// - Permissions-Policy: kamera, mikrofon, lokasi dimatikan karena tidak dipakai
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
