import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BRAND, TRIAL_DAYS } from '../data'
import { Button, Container } from './ui'

const LINKS = [
  ['#controle', 'Démo'],
  ['#fonctionnalites', 'Fonctionnalités'],
  ['#ecrans', 'Aperçu'],
  ['#tarifs', 'Tarifs'],
  ['#faq', 'FAQ'],
]

export function Logo() {
  return (
    <a href="#top" className="group flex items-center gap-2.5" aria-label={`${BRAND}, retour en haut`}>
      <img
        src={`${import.meta.env.BASE_URL}tempora-emblem.webp`}
        alt=""
        width={256}
        height={229}
        className="h-9 w-auto transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105"
      />
      <span className="font-display text-lg font-semibold tracking-[0.08em] text-ink uppercase">{BRAND}</span>
    </a>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Ferme le menu puis fait défiler vers la section (le défilement natif était interrompu par la fermeture)
  function go(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setOpen(false)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }

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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-full border-b border-line bg-bg/95 shadow-card backdrop-blur-xl md:hidden"
            aria-label="Navigation mobile"
          >
            <Container className="flex flex-col gap-1 pb-5">
              {LINKS.map(([href, label]) => (
                <a key={href} href={href} onClick={(e) => go(e, href)} className="flex min-h-12 items-center rounded-xl px-3 text-lg text-soft hover:bg-sunken hover:text-ink">
                  {label}
                </a>
              ))}
              <Button href="#essai" onClick={(e) => go(e, '#essai')} className="mt-2">
                Essai gratuit {TRIAL_DAYS} jours
              </Button>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
