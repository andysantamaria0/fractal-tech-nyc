'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Header({ userName }: { userName?: string }) {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="portal-header">
      <div className="header-content">
        <Link href="/dashboard" className="logo">Fractal Partners</Link>
        <nav>
          <ul className="nav-links">
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/cycles">Cycles</Link></li>
            <li><Link href="/settings">Settings</Link></li>
            {userName && <li><span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{userName}</span></li>}
            <li><button onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
