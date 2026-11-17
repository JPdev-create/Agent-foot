import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, Bell, Play, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { useRef } from 'react'
import { Button, Container } from './ui'
import { EASE } from './motion'

const STATS = [
  { value: '5', label: 'grands championnats' },
  { value: '8', label: 'agences rivales' },
  { value: '23', label: 'succès à débloquer' },
  { value: '0 €', label: 'aucune installation' },
]

const CURVE = [8, 10, 9, 14, 18, 17, 24, 31, 29, 38, 46, 58]

function PlayerCard() {
  const max = Math.max(...CURVE)
  const pts = CURVE.map((v, i) => `${(i / (CURVE.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ')
  return (
    <div className="relative rounded-[1.75rem] border border-line bg-surface/90 p-5 shadow-2xl shadow-black/60 backdrop-blur sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-lime to-gold font-display text-2xl text-night">LM</div>
          <div>
            <p className="text-lg font-semibold leading-tight text-ink">Lucas Mertens</p>
            <p className="text-sm text-ink-mute">17 ans · Ailier droit · Ambitieux</p>
          </div>
        </div>
        <span className="rounded-full bg-lime/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lime">Pépite</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Niveau', '71'],
          ['Potentiel', '89'],
          ['Forme', '8.2'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-pitch px-3 py-2.5">
            <p className="text-xs uppercase tracking-wider text-ink-mute">{k}</p>
            <p className="font-display text-3xl text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-line bg-pitch p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-ink-soft">Valeur marchande</span>
          <span className="flex items-center gap-1 font-semibold text-lime">
            <TrendingUp className="size-4" aria-hidden /> 0,8 → 5,8 M€
          </span>
        </div>
        <svg viewBox="0 0 100 42" className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#b6f24a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#b6f24a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.polygon points={`0,42 ${pts} 100,42`} fill="url(#g)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }} />
          <motion.polyline
            points={pts}
            fill="none"
            stroke="#b6f24a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 1.6, ease: EASE }}
          />
        </svg>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-lime px-4 py-3 text-night">
        <span className="text-sm font-semibold">Commission estimée</span>
        <span className="font-display text-2xl">+ 580 000 €</span>
      </div>
    </div>
  )
}

function Toast({ icon, title, text, className, delay }: { icon: React.ReactNode; title: string; text: string; className: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: EASE }}
      className={`absolute z-10 hidden items-center gap-3 rounded-2xl border border-line bg-night/90 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur sm:flex ${className}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-mute">{text}</p>
      </div>
    </motion.div>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 120])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const words = ['Déniche.', 'Négocie.', 'Fais briller.']

  return (
    <section ref={ref} id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-28">
      <div className="pitch-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-lime/15 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-[100px]" aria-hidden />

      <Container className="relative grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div style={{ opacity: fade }}>
          <motion.a
            href="#fonctionnalites"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            whileHover={{ scale: 1.03 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 py-1.5 pr-4 pl-1.5 text-sm text-ink-soft backdrop-blur"
          >
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-night">NOUVEAU</span>
            Tremplins néerlandais et portugais
            <ArrowRight className="size-4 text-lime" aria-hidden />
          </motion.a>

          <h1 className="text-[clamp(3.5rem,9vw,7.5rem)] text-ink">
            {words.map((w, i) => (
              <motion.span
                key={w}
                className={`block ${i === 2 ? 'text-gradient' : ''}`}
                initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.12 }}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
            className="mt-7 max-w-xl text-lg text-ink-soft sm:text-xl"
          >
            Dirige ton agence de joueurs belge. Repère les pépites dans les clubs du pays, fais-les grandir
            et place-les en Premier League, Liga, Serie A, Bundesliga ou Ligue 1.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Button href="/jeu/">
              <Play className="size-5 fill-current" aria-hidden /> Lancer une partie
            </Button>
            <Button href="#carriere" variant="ghost">
              Voir une carrière type
            </Button>
          </motion.div>

          <motion.dl
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.9 } } }}
            className="mt-14 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {STATS.map((s) => (
              <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="flex flex-col border-l-2 border-lime/60 pl-3">
                <dt className="order-2 text-sm text-ink-mute">{s.label}</dt>
                <dd className="font-display text-4xl text-ink">{s.value}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          style={{ y }}
          initial={{ opacity: 0, x: 40, rotate: 2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
          className="relative mx-auto w-full max-w-md"
        >
          <Toast
            className="-top-16 -left-12"
            delay={1.6}
            icon={<Bell className="size-4 text-gold" aria-hidden />}
            title="Offre reçue"
            text="Club anglais · 5,8 M€ + bonus"
          />
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
            <PlayerCard />
          </motion.div>
          <Toast
            className="-right-8 -bottom-8"
            delay={2}
            icon={<Trophy className="size-4 text-lime" aria-hidden />}
            title="Golden Boy"
            text="Ton client est nommé !"
          />
          <Sparkles className="absolute -top-4 -right-3 size-7 text-gold" aria-hidden />
        </motion.div>
      </Container>
    </section>
  )
}
