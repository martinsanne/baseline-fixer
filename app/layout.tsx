import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { cn } from '@/lib/cn';
import './globals.css';

const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vertical Metrics — center text in every button, on every system',
  description:
    'Fonts sit too high or too low in buttons, and differently on macOS, Windows and Android. Upload a font, see the offset per system, and download a fixed version.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(serif.variable, sans.variable, mono.variable)}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
