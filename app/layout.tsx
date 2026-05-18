import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PropFlow CRM',
  description: 'Real Estate CRM - Leads, Pipeline, and Smart Plans',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased h-full">{children}</body>
    </html>
  )
}
