'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ease, duration, drift } from '@/lib/engineer-animation-tokens'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: drift.page }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.page, ease: ease.page }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
