import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Container, Reveal, SectionHeading } from './ui'

const STEPS = [
  { when: 'Saison 1 · Semaine 3', title: 'Le repérage', text: 'Un ailier de 16 ans brille en D2 belge. Tu l’observes deux fois : potentiel élevé, caractère ambitieux.', tag: 'Détection' },
  { when: 'Semaine 5', title: 'Le mandat', text: 'Une agence rivale rôde. Tu proposes un mandat à 7 % avant elle : il signe.', tag: 'Signature' },
  { when: 'Saison 2 · Mercato d’hiver', title: 'Le prêt', text: 'Il ne joue pas en D1. Tu le prêtes à un club plus modeste : 18 titularisations, sa note grimpe.', tag: 'Progression' },
  { when: 'Saison 3 · Été', title: 'Le grand saut', text: 'Un tremplin néerlandais, puis la Premier League. Indemnité record, 10 % pour l’agence.', tag: 'Transfert' },
  { when: 'Saison 5', title: 'La consécration', text: 'Golden Boy, puis nommé au Ballon d’Or. Ton agence entre dans le top 3 du classement.', tag: 'Trophées' },
]

export function Career() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="carriere" className="relative border-y border-line bg-pitch py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Une carrière type"
          title={
            <>
              Du club de quartier <span className="text-gold">au Ballon d’Or</span>
            </>
          }
          intro="Exemple de partie : voici comment un inconnu de 16 ans peut devenir le client phare de ton agence."
        />

        <ol ref={ref} className="relative mx-auto max-w-3xl">
          <div className="absolute top-2 bottom-2 left-[15px] w-0.5 bg-line sm:left-1/2 sm:-translate-x-1/2" aria-hidden />
          <motion.div
            style={{ scaleY }}
            className="absolute top-2 bottom-2 left-[15px] w-0.5 origin-top bg-gradient-to-b from-lime to-gold sm:left-1/2 sm:-translate-x-1/2"
            aria-hidden
          />
          {STEPS.map((s, i) => {
            const right = i % 2 === 1
            return (
              <li key={s.title} className="relative mb-10 pl-12 last:mb-0 sm:grid sm:grid-cols-2 sm:gap-12 sm:pl-0">
                <span className="absolute top-6 left-[9px] size-3.5 rounded-full border-2 border-night bg-lime ring-4 ring-lime/20 sm:left-1/2 sm:-translate-x-1/2" aria-hidden />
                <Reveal className={right ? 'sm:col-start-2' : 'sm:text-right'} delay={0.05}>
                  <motion.article
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="rounded-card border border-line bg-surface p-6 hover:border-lime/40"
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider text-ink-mute">{s.when}</p>
                    <h3 className="mt-2 text-3xl text-ink">{s.title}</h3>
                    <p className="mt-2 text-ink-soft">{s.text}</p>
                    <span className="mt-4 inline-block rounded-full bg-lime/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lime">{s.tag}</span>
                  </motion.article>
                </Reveal>
              </li>
            )
          })}
        </ol>
      </Container>
    </section>
  )
}

export function CtaBand() {
  return (
    <section className="py-24 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-lime px-6 py-16 text-center text-night sm:px-12">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#05080a_1px,transparent_0)] [background-size:22px_22px]" aria-hidden />
            <div className="relative">
              <h2 className="text-5xl sm:text-7xl">Ton premier client t’attend.</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-night/80">
                Gratuit, sans compte, sans installation. La partie se sauvegarde automatiquement dans ton navigateur.
              </p>
              <motion.a
                href="/jeu/"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="mt-8 inline-flex min-h-13 items-center rounded-full bg-night px-8 text-lg font-semibold text-lime shadow-xl"
              >
                Jouer maintenant
              </motion.a>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

