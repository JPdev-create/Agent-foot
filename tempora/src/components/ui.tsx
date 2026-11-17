import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { EASE } from './motion'

export const Container = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
)

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.001, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

type BtnProps = HTMLMotionProps<'a'> & { variant?: 'primary' | 'secondary' | 'accent'; children: ReactNode }

export function Button({ variant = 'primary', className = '', children, ...props }: BtnProps) {
  const styles = {
    primary: 'bg-primary text-on-primary hover:bg-primary-strong shadow-[0_8px_24px_-8px_var(--t-primary)]',
    secondary: 'border border-line bg-surface text-ink hover:border-primary/50',
    accent: 'bg-ink text-bg hover:opacity-90',
  }[variant]
  return (
    <motion.a
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 font-semibold transition-colors ${styles} ${className}`}
      {...props}
    >
      {children}
    </motion.a>
  )
}

export function SectionHead({ eyebrow, title, intro, center = true }: { eyebrow: string; title: ReactNode; intro?: string; center?: boolean }) {
  return (
    <Reveal className={`mb-12 max-w-2xl sm:mb-16 ${center ? 'mx-auto text-center' : ''}`}>
      <p className="mb-3 text-sm font-bold tracking-[0.12em] text-primary uppercase">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold text-ink sm:text-5xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-soft">{intro}</p>}
    </Reveal>
  )
}

export function Phone({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`rounded-[2.2rem] border border-line bg-ink/90 p-2 shadow-card ${className}`}>
      <img src={src} alt={alt} width={1080} height={1920} loading="lazy" className="aspect-[9/16] w-full rounded-[1.7rem] object-cover object-top" />
    </div>
  )
}
