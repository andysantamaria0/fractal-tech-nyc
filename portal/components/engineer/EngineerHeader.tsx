'use client'

import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'
import { duration } from '@/lib/engineer-animation-tokens'

const navItems = [
  { href: '/engineer/dashboard', label: 'Dashboard' },
  { href: '/engineer/profile', label: 'Profile' },
  { href: '/engineer/matches', label: 'Matches' },
]

export default function EngineerHeader({ engineerName }: { engineerName?: string }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/engineer/login')
  }

  return (
    <>
    <style>{`@media (max-width: 640px) { .ep-header { flex-direction: column !important; gap: 12px !important; padding: 16px !important; } }`}</style>
    <header className="ep-header" style={{
      padding: '24px 48px',
      borderBottom: `1px solid ${c.stoneLight}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.parchment,
    }}>
      <a href="/engineer/dashboard" style={{
        fontFamily: f.mono, fontSize: 11, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: c.charcoal, textDecoration: 'none',
      }}>
        Fractal Hiring Spa
      </a>

      <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <motion.a
              key={item.href}
              href={item.href}
              whileHover={active ? undefined : { color: c.charcoal }}
              transition={{ duration: duration.hover }}
              style={{
                fontFamily: f.mono, fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', textDecoration: 'none',
                color: active ? c.charcoal : c.graphite,
                borderBottom: active ? `2px solid ${c.honey}` : '2px solid transparent',
                padding: '8px 0', transition: '150ms ease',
              }}
            >
              {item.label}
            </motion.a>
          )
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {engineerName && (
          <span style={{ fontFamily: f.mono, fontSize: 10, color: c.mist }}>
            {engineerName}
          </span>
        )}
        <motion.button
          onClick={handleLogout}
          whileHover={{ borderColor: c.honey, color: c.charcoal }}
          transition={{ duration: duration.hover }}
          style={{
            fontFamily: f.mono, fontSize: 10, letterSpacing: '0.05em',
            textTransform: 'uppercase', color: c.graphite, background: 'none',
            border: `1px solid ${c.stoneBorder}`, borderRadius: 4,
            padding: '6px 12px', cursor: 'pointer', transition: '150ms ease',
          }}
        >
          Log Out
        </motion.button>
      </div>
    </header>
    </>
  )
}
