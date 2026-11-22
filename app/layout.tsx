import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { FeedbackProvider } from '@/components/feedback';
import './globals.css';

// Satu keluarga font untuk judul & isi (dirancang Tokotype, Jakarta)
const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'] });

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
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
