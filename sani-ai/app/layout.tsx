import type { Metadata, Viewport } from 'next';
import './globals.css';

const name = process.env.NEXT_PUBLIC_APP_NAME || 'Sani AI';
export const metadata: Metadata = { title: `${name}: Turn questions into notebook-ready answers`, description: 'Ask a question, get a textbook-style answer, and write it into a notebook page.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
