'use client'

import { motion } from 'motion/react'
import { ease, duration, drift, stagger as s } from '@/lib/engineer-animation-tokens'

interface StaggerContainerProps {
  children: React.ReactNode
  stagger?: number
  delay?: number
  style?: React.CSSProperties
  className?: string
}

export function StaggerContainer({
  children,
  stagger = s.items,
  delay = s.initialDelay,
  style,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function StaggerItem({ children, style }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: drift.item },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: duration.page, ease: ease.page },
        },
      }}
      style={style}
    >
      {children}
    </motion.div>
  )
}
