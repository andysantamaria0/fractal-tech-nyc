import type { Metadata } from 'next'
import { Suspense } from 'react'
import PostHogProvider from '@/components/PostHogProvider'
import DarkMode from '@/components/DarkMode'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fractal Partners Portal',
  description: 'Partner portal for Fractal Bootcamp — track cohort progress, discover engineers, and submit feature requests.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <PostHogProvider>
            <DarkMode />
            {children}
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  )
}
