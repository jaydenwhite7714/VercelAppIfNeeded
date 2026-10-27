import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { ToastProvider } from '@/components/ui';
import { GuestAccessProvider } from '@/components/auth/GuestAccess';

export const metadata: Metadata = {
  metadataBase: new URL('https://unbilled.app'),
  title: {
    default: 'Unbilled — the free-work ledger for freelancers',
    template: '%s · Unbilled',
  },
  description:
    'Paste a client message. Unbilled checks it against your scope locally, prices the work, and writes a reply. No account is required; private cloud backups are optional and manual.',
  keywords: [
    'scope creep',
    'freelance scope',
    'change order template',
    'unbilled work',
    'freelancer client boundaries',
    'scope of work',
    'freelance pricing',
  ],
  authors: [{ name: 'Unbilled' }],
  openGraph: {
    title: 'Unbilled — the free-work ledger for freelancers',
    description:
      'Find the extra work hiding in client messages, price it at your rate, and send the reply that gets it paid.',
    type: 'website',
    url: '/',
    siteName: 'Unbilled',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unbilled — the free-work ledger for freelancers',
    description: 'Every favor has a price. Now you can see it.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f5f0e6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <ToastProvider>
          <GuestAccessProvider>{children}</GuestAccessProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
