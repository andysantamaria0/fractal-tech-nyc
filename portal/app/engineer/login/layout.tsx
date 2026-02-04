import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fractal Engineers',
  description: 'Intelligent job matching for Fractal engineers — build your EngineerDNA, get matched to roles that fit your skills, culture, and career goals.',
}

export default function EngineerLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
