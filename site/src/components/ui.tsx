import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

import { EASE } from './motion'

type ButtonProps = HTMLMotionProps<'a'> & { variant?: 'primary' | 'ghost'; children: ReactNode }

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors cursor-pointer select-none'
  const styles =
    variant === 'primary'
      ? 'bg-lime text-night hover:bg-lime-strong shadow-glow'
      : 'border border-line bg-surface/60 text-ink hover:border-lime/60 hover:bg-surface backdrop-blur'
  return (
    <motion.a
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`${base} ${styles} ${className}`}
      {...props}
    >
      {children}
    </motion.a>
  )
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: ReactNode; intro?: string }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-3xl text-center">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-lime">
        <span className="size-1.5 rounded-full bg-lime" aria-hidden />
        {eyebrow}
      </p>
      <h2 className="text-5xl text-ink sm:text-6xl md:text-7xl">{title}</h2>
      {intro && <p className="mt-5 text-lg text-ink-soft">{intro}</p>}
    </Reveal>
  )
}

export const Container = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
)

