'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function EngineerHeader({ engineerName }: { engineerName?: string }) {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="engineer-header">
      <div className="container">
        <div className="engineer-header-inner">
          <a href="/engineer/dashboard" className="engineer-logo">Fractal</a>
          <nav className="engineer-nav">
            <a href="/engineer/dashboard">Dashboard</a>
            <a href="/engineer/profile">Profile</a>
            <a href="/engineer/matches">Matches</a>
          </nav>
          <div className="engineer-header-right">
            {engineerName && <span className="engineer-user-name">{engineerName}</span>}
            <button onClick={handleLogout} className="engineer-logout-btn">Log Out</button>
          </div>
        </div>
      </div>
    </header>
  )
}
