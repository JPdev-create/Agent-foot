import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { lazy, Suspense, useRef } from 'react'
import { PROFILE } from '../data'
import { EASE } from './motion'
import { Container, MagneticButton } from './ui'

const Scene = lazy(() => import('../three/Scene'))

function SplitWord({ word, delay, className = '' }: { word: string; delay: number; className?: string }) {
  return (
    <span className={`inline-block [perspective:800px] ${className}`} aria-hidden>
      {word.split('').map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block origin-bottom"
          initial={{ opacity: 0, rotateX: -90, y: 40 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.045 }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

function Corner({ className }: { className: string }) {
  return <span className={`pointer-events-none absolute size-5 border-cyan/50 ${className}`} aria-hidden />
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120])
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 1.25])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section ref={ref} id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-24">
      {/* Atmosphère aurora */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] h-[70vh] w-[70vh] rounded-full bg-violet/20 blur-[140px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[60vh] w-[60vh] rounded-full bg-cyan/15 blur-[140px]" />
        <div className="grid-floor absolute inset-x-[-50%] bottom-[-10%] h-[55%]" />
      </div>

      {/* Scène 3D */}
      <motion.div style={{ scale: sceneScale, opacity: fade }} className="absolute inset-0">
        <Suspense fallback={<div className="absolute top-1/2 right-[12%] size-72 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet/40 to-cyan/30 blur-2xl" />}>
          <Scene />
        </Suspense>
      </motion.div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-6 hidden md:block" aria-hidden>
        <Corner className="top-20 left-0 border-t border-l" />
        <Corner className="top-20 right-0 border-t border-r" />
        <Corner className="bottom-0 left-0 border-b border-l" />
        <Corner className="right-0 bottom-0 border-r border-b" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="hud absolute top-24 right-8 text-right">
          SYS.PORTFOLIO <span className="text-cyan">v2026</span>
          <br />
          {PROFILE.location.toUpperCase()} · 50.6°N 5.5°E
        </motion.p>
      </div>

      <Container className="relative">
        <motion.div style={{ y: textY, opacity: fade }} className="max-w-4xl">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
            className="hud mb-8 flex items-center gap-3"
          >
            <span className="h-px w-12 bg-gradient-to-r from-cyan to-transparent" aria-hidden />
            Portfolio · {PROFILE.role}
          </motion.p>

          <h1 className="text-[clamp(3.6rem,13vw,10.5rem)] leading-[0.88] font-bold tracking-[-0.05em]">
            <span className="sr-only">
              {PROFILE.firstName} {PROFILE.lastName}
            </span>
            <SplitWord word={PROFILE.firstName} delay={0.45} className="text-ink" />
            <br />
            <SplitWord word={PROFILE.lastName} delay={0.75} className="text-holo pb-[0.14em]" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1.2 }}
            className="mt-8 max-w-xl text-lg text-ink-soft sm:text-xl"
          >
            Je conçois des <span className="text-ink">jeux</span> et des <span className="text-ink">expériences web</span> qui donnent envie
            de cliquer, de jouer et de revenir. De l’idée au lancement.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1.35 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <MagneticButton href="#projets">
              Explorer mes projets <ArrowUpRight className="size-5" aria-hidden />
            </MagneticButton>
            <MagneticButton href="#contact" variant="ghost">
              Me contacter
            </MagneticButton>
          </motion.div>
        </motion.div>
      </Container>

      <motion.a
        href="#projets"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="hud absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:flex flex-col items-center gap-3 hover:text-ink"
        aria-label="Faire défiler vers les projets"
      >
        Scroll
        <span className="grid h-10 w-6 place-items-start justify-center rounded-full border border-edge pt-2">
          <motion.span animate={{ y: [0, 12, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <ArrowDown className="size-3 text-cyan" />
          </motion.span>
        </span>
      </motion.a>
    </section>
  )
}
