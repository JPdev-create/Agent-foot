import { motion } from 'motion/react'
import { ArrowRight, CalendarCheck2, Check, MapPin, Route } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { SUBSCRIPTION, TRIAL_DAYS, euro, img } from '../data'
import { EASE } from './motion'
import { Button, Container, Phone } from './ui'

const HeroScene = lazy(() => import('../three/HeroScene'))
const START = 7 * 3600 + 45 * 60

function useLiveDuration() {
  const [secs, setSecs] = useState(() => {
    const n = new Date()
    const now = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()
    return now > START ? Math.min(now - START, 9 * 3600) : 2 * 3600 + 14 * 60
  })
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(secs / 3600))}:${p(Math.floor((secs % 3600) / 60))}:${p(secs % 60)}`
}

/** Texte qui se « décode » caractère par caractère, façon terminal. */
function Decode({ text, delay = 0 }: { text: string; delay?: number }) {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [out, setOut] = useState(() => (reduced ? text : text.replace(/\S/g, '·')))
  useEffect(() => {
    if (reduced) return
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&'
    let frame = 0
    let id: number
    const t = setTimeout(() => {
      id = window.setInterval(() => {
        frame++
        setOut(
          text
            .split('')
            .map((c, i) => (c === ' ' || i < frame / 2 ? c : chars[Math.floor(Math.random() * chars.length)]))
            .join(''),
        )
        if (frame / 2 > text.length) clearInterval(id)
      }, 30)
    }, delay)
    return () => {
      clearTimeout(t)
      clearInterval(id)
    }
  }, [text, delay, reduced])
  return <span>{out}</span>
}

function HudCard({ children, className, delay }: { children: React.ReactNode; className: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: EASE }}
      className={`glass absolute z-10 rounded-2xl bg-[#0b0e1c]/85 px-4 py-3 shadow-card ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function Hero() {
  const t = useLiveDuration()
  return (
    <section id="top" className="relative overflow-hidden pt-8 pb-20 sm:pt-14 lg:pb-28">
      <div className="timesheet pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="pointer-events-none absolute -top-48 left-[-10%] size-[40rem] rounded-full bg-primary/20 blur-[140px]" aria-hidden />
      <div className="pointer-events-none absolute right-[-10%] bottom-[-20%] size-[34rem] rounded-full bg-cyan/10 blur-[140px]" aria-hidden />

      <Container className="relative grid items-center gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
        <div className="relative z-10">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 font-mono text-xs tracking-[0.14em] text-soft uppercase"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-ok" />
            </span>
            <Decode text="Pointeuse nouvelle génération" delay={200} />
          </motion.p>

          <h1 className="mt-7 text-[clamp(2.1rem,4.2vw,3.5rem)] font-bold text-ink">
            {['Le temps', 'de vos équipes,'].map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.1 }}
              >
                {line}
              </motion.span>
            ))}
            <motion.span
              className="text-plasma block"
              initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
            >
              sous contrôle.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
            className="mt-6 max-w-xl text-lg text-soft sm:text-xl"
          >
            Pointage en un geste, planning généré automatiquement, chantiers, tournées et kilomètres. Toute votre équipe de terrain, en
            temps réel, dans une seule appli.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Button href="#essai">
              Essayer {TRIAL_DAYS} jours gratuits <ArrowRight className="size-5" aria-hidden />
            </Button>
            <Button href="#controle" variant="secondary">
              Voir la démo en direct
            </Button>
          </motion.div>

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-soft">
            {[`Dès ${euro(SUBSCRIPTION.pricePerEmployee, 2)} / employé / mois`, 'Ou achat à vie', 'Android, iPhone & ordinateur'].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="size-4 text-cyan" aria-hidden /> {x}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Scène 3D + cartes HUD */}
        <div className="relative h-[460px] sm:h-[560px] lg:h-[620px]">
          <Suspense
            fallback={
              <div className="absolute inset-0 grid place-items-center">
                <Phone src={img('01-pointage.png')} alt="" className="w-48" />
              </div>
            }
          >
            <HeroScene />
          </Suspense>

          <HudCard className="top-[6%] left-0 sm:left-[2%]" delay={1}>
            <p className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wider text-ok uppercase">
              <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Au travail
            </p>
            <p className="font-mono text-2xl font-semibold text-ink tabular-nums">{t}</p>
            <p className="flex items-center gap-1 text-xs text-mute">
              <MapPin className="size-3" aria-hidden /> Exemple · chantier Ciney
            </p>
          </HudCard>

          <HudCard className="right-0 bottom-[16%] hidden sm:block" delay={1.25}>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarCheck2 className="size-4 text-primary" aria-hidden /> Planning de la semaine
            </p>
            <p className="text-xs text-mute">Généré automatiquement · congés pris en compte</p>
          </HudCard>

          <HudCard className="bottom-[4%] left-[8%]" delay={1.5}>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Route className="size-4 text-accent" aria-hidden /> Tournée optimisée
            </p>
            <p className="text-xs text-mute">Ordre des chantiers et kilomètres calculés</p>
          </HudCard>
        </div>
      </Container>
      <div className="beam absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 opacity-60" aria-hidden />
    </section>
  )
}
