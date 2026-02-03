'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DarkMode() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === 'andy@fractalbootcamp.com') {
        document.documentElement.classList.add('dark-mode')
      }
    })
  }, [])

  return null
}
