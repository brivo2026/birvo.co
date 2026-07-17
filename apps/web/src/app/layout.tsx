import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BIRVO — Tus conversaciones. Un solo lugar.',
  description:
    'BIRVO centraliza las conversaciones de WhatsApp, Instagram y Messenger en una sola bandeja para tu equipo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
