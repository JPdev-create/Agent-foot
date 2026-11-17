import { ArrowUp } from 'lucide-react'
import { motion } from 'motion/react'
import { Logo } from './Navbar'
import { Container } from './ui'

const YEAR = new Date().getFullYear()

const COLS = [
  { title: 'Le jeu', links: [['Jouer', '/jeu/'], ['Fonctionnalités', '#fonctionnalites'], ['Carrière type', '#carriere']] },
  { title: 'Aide', links: [['FAQ', '#faq'], ['Contact', '#contact'], ['Signaler un bug', '#contact']] },
  { title: 'Championnats', links: [['Angleterre', '#fonctionnalites'], ['Espagne', '#fonctionnalites'], ['Italie', '#fonctionnalites'], ['Allemagne', '#fonctionnalites'], ['France', '#fonctionnalites']] },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-night pt-16 pb-8">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-ink-mute">Le jeu de gestion où tu diriges une agence de joueurs belge, des terrains de D3 aux sommets européens.</p>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="font-display text-xl tracking-wide text-ink">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-ink-mute transition-colors hover:text-lime">{label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-sm text-ink-mute sm:flex-row">
          <p>© {YEAR} Agent Foot. Jeu indépendant, clubs et joueurs fictifs.</p>
          <motion.a href="#top" whileHover={{ y: -3 }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 hover:border-lime/50 hover:text-ink">
            Haut de page <ArrowUp className="size-4" aria-hidden />
          </motion.a>
        </div>
      </Container>
    </footer>
  )
}
