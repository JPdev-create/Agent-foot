import { motion } from 'motion/react'
import { ArrowRight, Check, MapPin, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SUBSCRIPTION, TRIAL_DAYS, euro, img } from '../data'
import { EASE } from './motion'
import { Button, Container, Phone } from './ui'

const START = 7 * 3600 + 45 * 60 // pointage démarré à 07:45

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

function LiveCard() {
  const t = useLiveDuration()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
      className="absolute -bottom-6 -left-4 z-20 w-64 rounded-2xl border border-line bg-surface p-4 shadow-card sm:-left-12"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ok uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ok" />
          </span>
          Au travail
        </span>
        <span className="flex items-center gap-1 text-xs text-mute">
          <MapPin className="size-3.5" aria-hidden /> Chantier Ciney
        </span>
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-ink" aria-label="Exemple de durée de pointage en cours">
        {t}
      </p>
      <p className="text-sm text-mute">Exemple · depuis 07:45</p>
    </motion.div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-10 pb-24 sm:pt-16 lg:pb-32">
      <div className="timesheet pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div className="pointer-events-none absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-primary/15 blur-[120px]" aria-hidden />
      <Container className="relative grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-soft"
          >
            <Radio className="size-4 text-accent" aria-hidden />
            Utilisée chaque jour par des équipes de chantier
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
            className="mt-6 text-[clamp(2.5rem,6vw,4.4rem)] font-extrabold text-ink"
          >
            Le temps de vos équipes, <span className="text-primary">enfin sous contrôle.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
            className="mt-6 max-w-xl text-lg text-soft sm:text-xl"
          >
            Tempora est la pointeuse en ligne pensée pour le terrain : pointage en un geste, planning automatique, chantiers, tournées et
            kilomètres. Sur téléphone, tablette et ordinateur.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.28 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Button href="#essai">
              Essayer gratuitement <ArrowRight className="size-5" aria-hidden />
            </Button>
            <Button href="#tarifs" variant="secondary">
              Voir les tarifs
            </Button>
          </motion.div>
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-soft"
          >
            {[`${TRIAL_DAYS} jours d’essai gratuit`, `Dès ${euro(SUBSCRIPTION.pricePerEmployee, 2)} / employé / mois`, 'Ou achat à vie'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-ok" aria-hidden /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 4 }}
            animate={{ opacity: 1, y: 0, rotate: 6 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
            className="absolute top-10 right-0 w-[52%]"
          >
            <Phone src={img('05-en-direct.png')} alt="Écran « En direct » : les pointages de l’équipe en temps réel" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="relative z-10 w-[62%]"
          >
            <Phone src={img('01-pointage.png')} alt="Écran de pointage : bouton « Démarrer un pointage » et planning de la semaine" />
          </motion.div>
          <LiveCard />
        </div>
      </Container>
    </section>
  )
}
