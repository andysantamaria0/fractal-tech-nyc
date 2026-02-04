'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/posthog'
import Link from 'next/link'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newsletterOptin, setNewsletterOptin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    trackEvent('settings_viewed')
  }, [])

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
          .select('newsletter_optin, is_admin')
          .eq('id', user.id)
          .single()

        if (profile) {
          setNewsletterOptin(profile.newsletter_optin ?? false)
          setIsAdmin(profile.is_admin === true)
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
    if (!user) {
      setMessage('Session expired. Please log in again.')
      setIsError(true)
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ newsletter_optin: newsletterOptin })
      .eq('id', user.id)

    if (error) {
      setMessage('Failed to save settings')
      setIsError(true)
      trackEvent('settings_saved', { newsletter_optin: newsletterOptin, success: false })
    } else {
      setMessage('Settings saved')
      setIsError(false)
      trackEvent('settings_saved', { newsletter_optin: newsletterOptin, success: true })
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
              <div className={`alert ${isError ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 'var(--space-5)' }}>
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

        {isAdmin && (
          <div className="window">
            <div className="window-title">Engineer Profile</div>
            <div className="window-content">
              <p style={{ color: 'var(--color-slate)', marginBottom: 'var(--space-5)' }}>
                If you&apos;re a Fractal engineer, manage your public profile that companies see.
              </p>
              <Link href="/engineer/legacy-profile" className="btn-secondary">
                Edit Engineer Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
