import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kantong',
  description: 'Catat keuangan, isi kantong budget, pantau tagihan dan emas.',
};

// viewportFit 'cover' -> konten boleh sampai area notch; bottom nav pakai env(safe-area-inset-bottom)
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#f5f6f3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
