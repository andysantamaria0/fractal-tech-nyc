'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newsletterOptin, setNewsletterOptin] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('newsletter_optin')
          .eq('id', user.id)
          .single()

        if (profile) {
          setNewsletterOptin(profile.newsletter_optin ?? false)
        }
      } catch {
        // Dev mode without Supabase configured
      }
      setLoading(false)
    }

    loadProfile()
  }, [supabase])

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ newsletter_optin: newsletterOptin })
      .eq('id', user.id)

    if (error) {
      setMessage('Failed to save settings')
    } else {
      setMessage('Settings saved')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="window">
          <div className="window-title">Settings</div>
          <div className="window-content">
            <div className="loading-text">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div>
          <div className="section-label">Settings</div>
          <h1 className="section-title">Email Preferences</h1>
        </div>

        <div className="window">
          <div className="window-title">Notifications</div>
          <div className="window-content">
            {message && (
              <div className="alert alert-success" style={{ marginBottom: 'var(--space-5)' }}>
                {message}
              </div>
            )}

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={newsletterOptin}
                  onChange={(e) => setNewsletterOptin(e.target.checked)}
                />
                <span>Receive bi-weekly cohort update emails</span>
              </label>
            </div>

            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
