'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const DarkModeContext = createContext({
  isDark: false,
  toggle: () => {},
})

export function useDarkMode() {
  return useContext(DarkModeContext)
}

export default function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('dark-mode')
    if (stored === 'true') {
      setIsDark(true)
      document.documentElement.classList.add('dark-mode')
    }
  }, [])

  function toggle() {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem('dark-mode', String(next))
      if (next) {
        document.documentElement.classList.add('dark-mode')
      } else {
        document.documentElement.classList.remove('dark-mode')
      }
      return next
    })
  }

  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  )
}
