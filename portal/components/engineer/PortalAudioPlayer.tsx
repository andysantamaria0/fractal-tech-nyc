'use client'

import { useRef, useState, useEffect } from 'react'
import { colors as c, fonts as f } from '@/lib/engineer-design-tokens'

const AUDIO_URL = 'https://cdn1.suno.ai/6b2081f6-c25c-441e-91ca-a44c88f135eb.mp3'
const MUTE_KEY = 'ep-muted'

export default function PortalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(true)
  const [needsInteraction, setNeedsInteraction] = useState(false)

  // Load mute preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(MUTE_KEY)
    const shouldMute = stored === 'true'
    setMuted(shouldMute)

    const audio = audioRef.current
    if (!audio) return

    audio.muted = shouldMute

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked — wait for user interaction
        setNeedsInteraction(true)
      })
    }
  }, [])

  // Resume playback on first user interaction if autoplay was blocked
  useEffect(() => {
    if (!needsInteraction) return

    const resume = () => {
      const audio = audioRef.current
      if (audio) {
        audio.play().catch(() => {})
      }
      setNeedsInteraction(false)
      document.removeEventListener('click', resume)
      document.removeEventListener('keydown', resume)
    }

    document.addEventListener('click', resume)
    document.addEventListener('keydown', resume)
    return () => {
      document.removeEventListener('click', resume)
      document.removeEventListener('keydown', resume)
    }
  }, [needsInteraction])

  const toggle = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem(MUTE_KEY, String(next))
    const audio = audioRef.current
    if (audio) {
      audio.muted = next
      // If audio hasn't started yet, kick it off
      if (audio.paused) {
        audio.play().catch(() => {})
      }
    }
  }

  return (
    <>
      <audio ref={audioRef} src={AUDIO_URL} loop preload="auto" />
      <button
        onClick={toggle}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 20,
          border: `1px solid ${c.stoneBorder}`,
          backgroundColor: c.fog,
          color: c.graphite,
          fontFamily: f.mono,
          fontSize: 11,
          letterSpacing: '0.03em',
          cursor: 'pointer',
          opacity: 0.75,
          transition: 'opacity 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
      >
        {muted ? '♪ unmute' : '♪ playing'}
      </button>
    </>
  )
}
