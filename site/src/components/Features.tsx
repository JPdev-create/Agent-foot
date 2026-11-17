import { motion } from 'motion/react'
import { Binoculars, Building2, Calendar, Globe2, Handshake, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Container, SectionHeading } from './ui'
import { EASE } from './motion'

type Feature = { icon: ReactNode; title: string; text: string; className: string; visual?: ReactNode }

const LEAGUES = ['Angleterre', 'Espagne', 'Italie', 'Allemagne', 'France', 'Pays-Bas', 'Portugal']

const FEATURES: Feature[] = [
  {
    icon: <Binoculars className="size-6" />,
    title: 'Détection',
    text: 'Observe les jeunes des trois divisions belges, lance des voyages de détection et repère le caractère de chaque joueur : travailleur, leader, fêtard ou fragile.',
    className: 'md:col-span-2 lg:col-span-4',
    visual: (
      <div className="mt-6 flex flex-wrap gap-2">
        {['Travailleur', 'Ambitieux', 'Loyal', 'Leader', 'Fêtard', 'Fragile'].map((t, i) => (
          <span key={t} className={`rounded-full border px-3 py-1 text-sm ${i < 4 ? 'border-lime/40 bg-lime/10 text-lime' : 'border-red/40 bg-red/10 text-red'}`}>
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: <Handshake className="size-6" />,
    title: 'Négociation à paliers',
    text: 'Commission à 5, 7 ou 10 %, salaire, prime à la signature : chaque tour de négociation compte.',
    className: 'lg:col-span-2',
    visual: (
      <div className="mt-6 flex items-end gap-2" aria-hidden>
        {[40, 62, 85].map((h, i) => (
          <motion.div
            key={h}
            className="flex-1 rounded-t-lg bg-gradient-to-t from-lime/30 to-lime"
            initial={{ height: 0 }}
            whileInView={{ height: h }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: EASE }}
          />
        ))}
      </div>
    ),
  },
  {
    icon: <Calendar className="size-6" />,
    title: 'Mercato vivant',
    text: 'Fenêtres d’été et d’hiver, enchères, jour de clôture sous tension et prêts pour faire jouer tes jeunes.',
    className: 'lg:col-span-2',
  },
  {
    icon: <Globe2 className="size-6" />,
    title: '7 championnats, des coupes d’Europe',
    text: 'Tous les championnats jouent chaque semaine : classements, buteurs, notes de match, Ligue des champions et sélections nationales.',
    className: 'md:col-span-2 lg:col-span-4',
    visual: (
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <div className="animate-marquee flex w-max gap-3">
          {[...LEAGUES, ...LEAGUES].map((l, i) => (
            <span key={i} className="rounded-xl border border-line bg-pitch px-4 py-2 font-display text-xl tracking-wide text-ink-soft">
              {l}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <Building2 className="size-6" />,
    title: 'Fais grandir l’agence',
    text: 'Bureau, personnel à 3 niveaux, académie, sponsoring et classement face à 8 agences rivales.',
    className: 'lg:col-span-3',
  },
  {
    icon: <Trophy className="size-6" />,
    title: 'Cérémonie des trophées',
    text: 'Golden Boy, Soulier d’or, Ballon d’Or… et en fin de partie, rachète un club et passe président.',
    className: 'lg:col-span-3',
  },
]

export function Features() {
  return (
    <section id="fonctionnalites" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Fonctionnalités"
          title={
            <>
              Tout le métier d’agent, <span className="text-lime">semaine après semaine</span>
            </>
          }
          intro="Chaque semaine, quelques actions : observer, signer un mandat, proposer à un club, renégocier. Tes choix façonnent des carrières entières."
        />
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6"
        >
          {FEATURES.map((f) => (
            <motion.li
              key={f.title}
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
              whileHover={{ y: -6 }}
              className={`group relative overflow-hidden rounded-card border border-line bg-surface p-7 transition-colors duration-300 hover:border-lime/50 ${f.className}`}
            >
              <div
                className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-lime/0 blur-3xl transition-colors duration-500 group-hover:bg-lime/15"
                aria-hidden
              />
              <div className="relative">
                <span className="grid size-12 place-items-center rounded-2xl bg-lime/10 text-lime transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-5 text-3xl text-ink sm:text-4xl">{f.title}</h3>
                <p className="mt-2 text-ink-soft">{f.text}</p>
                {f.visual}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </section>
  )
}
