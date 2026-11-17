import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { Gamepad2, Layers, MonitorSmartphone, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { PROCESS, PROFILE, SKILLS } from '../data'
import { EASE } from './motion'
import { Container, Reveal, SectionTitle } from './ui'

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const v = useMotionValue(0)
  const text = useTransform(v, (n) => `${Math.round(n).toLocaleString('fr-BE')}${suffix}`)
  useEffect(() => {
    if (inView) animate(v, to, { duration: 1.8, ease: EASE })
  }, [inView, to, v])
  return <motion.span ref={ref}>{text}</motion.span>
}

const STATS = [
  { to: 3000, suffix: '+', label: 'lignes de JavaScript pour Agent Foot' },
  { to: 7, suffix: '', label: 'championnats simulés chaque semaine' },
  { to: 20, suffix: '+', label: 'mises à jour publiées' },
  { to: 0, suffix: '', label: 'dépendance dans le moteur du jeu' },
]

const ICONS = [Gamepad2, MonitorSmartphone, Sparkles, Layers]

export function About() {
  return (
    <section id="apropos" className="relative border-y border-white/5 bg-deep py-28 sm:py-40">
      <div className="pointer-events-none absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan/50 to-transparent" aria-hidden />
      <Container>
        <SectionTitle
          index="02"
          label="À propos"
          title={
            <>
              Entre game design <br className="hidden sm:block" />
              et <span className="text-holo">ingénierie web.</span>
            </>
          }
        />
        <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <Reveal>
            <div className="space-y-5 text-lg text-ink-soft">
              <p>
                Je suis <span className="text-ink">{PROFILE.firstName} {PROFILE.lastName}</span>, créateur basé en {PROFILE.location}. Je construis des jeux
                et des interfaces où chaque clic a du sens : des systèmes profonds, une prise en main immédiate et des détails qui font sourire.
              </p>
              <p>
                Mon projet phare, <span className="text-ink">Agent Foot</span>, est né d’une passion pour le football et la gestion : un jeu complet,
                jouable dans le navigateur, que je fais évoluer mise à jour après mise à jour.
              </p>
              <p>Aujourd’hui, j’associe cette approche « jeu » à des sites modernes : 3D, animations fluides et performances soignées.</p>
            </div>
          </Reveal>
          <dl className="grid grid-cols-2 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="glass flex h-full flex-col justify-between rounded-3xl p-6">
                  <dt className="order-2 mt-3 text-sm text-ink-soft">{s.label}</dt>
                  <dd className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                    <Counter to={s.to} suffix={s.suffix} />
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  )
}

export function Skills() {
  return (
    <section id="savoir-faire" className="relative py-28 sm:py-40">
      <Container>
        <SectionTitle
          index="03"
          label="Savoir-faire"
          title={
            <>
              Une boîte à outils <span className="text-holo">complète.</span>
            </>
          }
          intro="Du système de jeu à la dernière micro-interaction, je maîtrise toute la chaîne."
        />
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {SKILLS.map((g, i) => {
            const Icon = ICONS[i]
            return (
              <motion.li
                key={g.group}
                variants={{ hidden: { opacity: 0, y: 30, rotateX: -15 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.7, ease: EASE } } }}
                whileHover={{ y: -8 }}
                className="group glass relative overflow-hidden rounded-3xl p-7 transition-colors duration-300 hover:border-cyan/40"
              >
                <div className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-cyan/0 blur-3xl transition-colors duration-500 group-hover:bg-cyan/20" aria-hidden />
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan/20 to-violet/20 text-cyan transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-6 text-2xl font-semibold text-ink">{g.group}</h3>
                <ul className="mt-4 space-y-2">
                  {g.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 font-mono text-sm text-ink-soft">
                      <span className="text-cyan" aria-hidden>›</span> {it}
                    </li>
                  ))}
                </ul>
              </motion.li>
            )
          })}
        </motion.ul>

        <div className="mt-24">
          <Reveal>
            <p className="hud mb-8">Méthode</p>
          </Reveal>
          <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: EASE }}
              className="absolute top-5 right-0 left-0 hidden h-px origin-left bg-gradient-to-r from-cyan via-violet to-magenta md:block"
              aria-hidden
            />
            {PROCESS.map((s, i) => (
              <Reveal key={s.n} delay={0.15 + i * 0.12}>
                <li className="relative">
                  <span className="relative z-10 grid size-10 place-items-center rounded-full border border-cyan/40 bg-void font-mono text-sm text-cyan">{s.n}</span>
                  <h3 className="mt-5 text-2xl font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-ink-soft">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  )
}
