import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { BRAND, TRIAL_DAYS } from '../data'
import { Button, Container } from './ui'

const LINKS = [
  ['#fonctionnalites', 'Fonctionnalités'],
  ['#ecrans', 'Aperçu'],
  ['#tarifs', 'Tarifs'],
  ['#faq', 'FAQ'],
]

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5" aria-label={`${BRAND}, retour en haut`}>
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
        <rect width="64" height="64" rx="16" fill="var(--t-primary)" />
        <circle cx="32" cy="34" r="16" fill="none" stroke="var(--t-on-primary)" strokeWidth="4" />
        <path d="M32 24v10l7 5" fill="none" stroke="var(--t-on-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="27" y="9" width="10" height="5" rx="2" fill="#fdba74" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-ink">{BRAND}</span>
    </a>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12))

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled || open ? 'border-b border-line bg-bg/85 backdrop-blur-xl' : 'border-b border-transparent'}`}
    >
      <Container className="flex h-18 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg px-3.5 py-2 font-medium text-soft transition-colors hover:bg-sunken hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button href="#essai" className="min-h-11 px-5 text-[0.95rem]">
            Essai gratuit {TRIAL_DAYS} jours
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid size-11 place-items-center rounded-xl border border-line text-ink md:hidden"
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
            className="overflow-hidden md:hidden"
            aria-label="Navigation mobile"
          >
            <Container className="flex flex-col gap-1 pb-5">
              {LINKS.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg text-soft hover:bg-sunken hover:text-ink">
                  {label}
                </a>
              ))}
              <Button href="#essai" onClick={() => setOpen(false)} className="mt-2">
                Essai gratuit {TRIAL_DAYS} jours
              </Button>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
