'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/components/DarkMode'

export default function Header({ userName, isAdmin, hasHiringSpaAccess }: { userName?: string; isAdmin?: boolean; hasHiringSpaAccess?: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const { isDark, toggle } = useDarkMode()

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
            {hasHiringSpaAccess && <li><Link href="/hiring-spa">Hiring Spa</Link></li>}
            {isAdmin && <li><Link href="/admin/cycles" style={{ color: 'var(--color-accent)' }}>Admin</Link></li>}
            {userName && <li><span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{userName}</span></li>}
            <li><button onClick={toggle}>{isDark ? 'Light' : 'Dark'}</button></li>
            <li><button onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
