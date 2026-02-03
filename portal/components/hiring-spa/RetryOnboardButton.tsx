'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RetryOnboardButton({ label = 'Retry Analysis' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const retry = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/hiring-spa/onboard', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        className="spa-btn spa-btn-primary"
        onClick={retry}
        disabled={loading}
      >
        {loading ? 'Starting...' : label}
      </button>
      {error && (
        <p className="spa-body-small" style={{ color: '#c0392b', marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}
