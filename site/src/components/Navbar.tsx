import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Container } from './ui'

const LINKS = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#carriere', label: 'Une carrière' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
]

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5" aria-label="Agent Foot, retour en haut">
      <span className="grid size-9 place-items-center rounded-xl bg-lime text-night">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7.5l4 3-1.5 4.7h-5L8 10.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-2xl tracking-wide text-ink">
        Agent <span className="text-lime">Foot</span>
      </span>
    </a>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24))

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? 'border-b border-line bg-night/85 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <Container className="flex h-18 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-[0.95rem] font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:block">
          <Button href="/jeu/" className="min-h-11 px-5 text-[0.95rem]">Jouer gratuitement</Button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid size-11 place-items-center rounded-full border border-line text-ink md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden md:hidden"
            aria-label="Navigation mobile"
          >
            <Container className="flex flex-col gap-1 pb-6">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg text-ink-soft hover:bg-surface hover:text-ink">
                  {l.label}
                </a>
              ))}
              <Button href="/jeu/" className="mt-3">Jouer gratuitement</Button>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
