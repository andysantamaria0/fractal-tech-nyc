'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RetryOnboardButton({ label = 'Retry Analysis' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const retry = async () => {
    setLoading(true)
    try {
      await fetch('/api/hiring-spa/onboard', { method: 'POST' })
      router.refresh()
    } catch {
      // Best effort
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className="spa-btn spa-btn-primary"
      onClick={retry}
      disabled={loading}
      style={{ marginTop: 16 }}
    >
      {loading ? 'Starting...' : label}
    </button>
  )
}
