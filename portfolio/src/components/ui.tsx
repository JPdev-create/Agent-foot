import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { EASE } from './motion'

export const Container = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 ${className}`}>{children}</div>
)

export function Reveal({ children, delay = 0, className = '', y = 32 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Bouton magnétique : suit légèrement le curseur au survol. */
export function MagneticButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: HTMLMotionProps<'a'> & { variant?: 'primary' | 'ghost'; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 })
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 })
  const styles =
    variant === 'primary'
      ? 'bg-cyan text-void shadow-[0_0_0_1px_rgb(34_211_238/0.4),0_10px_40px_-8px_rgb(34_211_238/0.6)] hover:shadow-[0_0_0_1px_rgb(34_211_238/0.6),0_14px_50px_-6px_rgb(34_211_238/0.8)]'
      : 'glass text-ink hover:border-cyan/50'
  return (
    <motion.a
      ref={ref}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * 0.25)
        y.set((e.clientY - r.top - r.height / 2) * 0.35)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
      whileTap={{ scale: 0.96 }}
      className={`relative inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-7 font-semibold transition-shadow duration-300 ${styles} ${className}`}
      {...props}
    >
      {children}
    </motion.a>
  )
}

export function SectionTitle({ index, label, title, intro }: { index: string; label: string; title: ReactNode; intro?: string }) {
  return (
    <div className="mb-14 grid gap-6 md:mb-20 md:grid-cols-[auto_1fr] md:gap-16">
      <Reveal>
        <p className="hud flex items-center gap-3">
          <span className="text-cyan">{index}</span>
          <span className="h-px w-10 bg-edge" aria-hidden />
          {label}
        </p>
      </Reveal>
      <div>
        <Reveal delay={0.05}>
          <h2 className="text-4xl font-semibold text-ink sm:text-6xl lg:text-7xl">{title}</h2>
        </Reveal>
        {intro && (
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft">{intro}</p>
          </Reveal>
        )}
      </div>
    </div>
  )
}
