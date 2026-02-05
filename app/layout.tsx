import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vertical Metrics Fixer',
  description: 'Fix inconsistent vertical metrics in your font files',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
