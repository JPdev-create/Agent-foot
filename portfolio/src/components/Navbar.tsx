import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { PROFILE } from '../data'
import { EASE } from './motion'

const LINKS = [
  ['#projets', 'Projets'],
  ['#apropos', 'À propos'],
  ['#savoir-faire', 'Savoir-faire'],
  ['#contact', 'Contact'],
]

export function Monogram() {
  return (
    <a href="#top" className="group flex items-center gap-3" aria-label={`${PROFILE.firstName} ${PROFILE.lastName}, retour en haut`}>
      <span className="relative grid size-10 place-items-center">
        <svg viewBox="0 0 40 40" className="absolute inset-0 size-10 transition-transform duration-700 group-hover:rotate-180" aria-hidden>
          <defs>
            <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path d="M20 2l15.6 9v18L20 38 4.4 29V11z" fill="none" stroke="url(#mg)" strokeWidth="1.6" />
        </svg>
        <span className="relative text-sm font-bold">JP</span>
      </span>
      <span className="hidden font-semibold tracking-tight text-ink sm:block">
        {PROFILE.firstName} <span className="text-ink-soft">{PROFILE.lastName}</span>
      </span>
    </a>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <>
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-cyan via-violet to-magenta" aria-hidden />
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        className="fixed inset-x-0 top-4 z-50 px-4"
      >
        <div className="glass mx-auto flex h-16 max-w-5xl items-center justify-between rounded-full pr-2 pl-3 sm:pl-4">
          <Monogram />
          <nav className="hidden items-center md:flex" aria-label="Navigation principale">
            {LINKS.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-4 py-2 text-[0.95rem] text-ink-soft transition-colors hover:bg-white/5 hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {PROFILE.available && (
              <span className="hud hidden items-center gap-2 lg:flex">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-cyan" />
                </span>
                Disponible
              </span>
            )}
            <a href="#contact" className="hidden min-h-11 items-center rounded-full bg-ink px-5 text-[0.95rem] font-semibold text-void transition-colors hover:bg-cyan md:inline-flex">
              Travaillons ensemble
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="grid size-11 place-items-center rounded-full text-ink hover:bg-white/5 md:hidden"
              aria-expanded={open}
              aria-controls="nav-mobile"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav
              id="nav-mobile"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="glass mx-auto mt-2 flex max-w-5xl flex-col gap-1 rounded-3xl bg-deep/80 p-3 md:hidden"
              aria-label="Navigation mobile"
            >
              {LINKS.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-lg text-ink-soft hover:bg-white/5 hover:text-ink">
                  {label}
                </a>
              ))}
              <a href="#contact" onClick={() => setOpen(false)} className="mt-1 rounded-2xl bg-cyan px-4 py-3 text-center font-semibold text-void">
                Travaillons ensemble
              </a>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  )
}
