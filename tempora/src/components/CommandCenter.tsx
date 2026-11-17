import { motion, useInView } from 'motion/react'
import { Coffee, Radio, Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EASE } from './motion'
import { Container, Reveal, SectionHead } from './ui'

// Données d'exemple (démonstration) : chantiers fictifs sur une carte stylisée
const SITES = [
  { x: 90, y: 230, name: 'Dépôt' },
  { x: 210, y: 120, name: 'Villa Lambert' },
  { x: 360, y: 170, name: 'Rénovation école' },
  { x: 470, y: 80, name: 'Bureaux Horizon' },
  { x: 560, y: 250, name: 'Résidence du Parc' },
]
const ROUTE = 'M90 230 C 130 160, 170 130, 210 120 S 320 190, 360 170 S 440 70, 470 80 S 560 180, 560 250'

const TEAM = [
  { name: 'Amélie R.', site: 'Villa Lambert', start: 7 * 3600 + 30 * 60, status: 'work' as const },
  { name: 'Karim B.', site: 'Rénovation école', start: 7 * 3600 + 45 * 60, status: 'work' as const },
  { name: 'Tom V.', site: 'Bureaux Horizon', start: 8 * 3600, status: 'pause' as const },
  { name: 'Léa M.', site: 'En route · Résidence du Parc', start: 8 * 3600 + 15 * 60, status: 'drive' as const },
]

function useNowSecs() {
  const [s, setS] = useState(() => {
    const d = new Date()
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  })
  useEffect(() => {
    const id = setInterval(() => setS((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return s
}

const fmt = (secs: number) => {
  const v = Math.max(0, secs)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(v / 3600))}:${p(Math.floor((v % 3600) / 60))}:${p(v % 60)}`
}

function Map() {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dots = []
  for (let x = 20; x < 640; x += 28) for (let y = 20; y < 320; y += 28) dots.push([x, y])

  return (
    <svg ref={ref} viewBox="0 0 640 320" className="h-auto w-full" role="img" aria-label="Carte de démonstration : tournée reliant cinq chantiers">
      <defs>
        <linearGradient id="route" x1="0" x2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b8cff" />
        </linearGradient>
        <radialGradient id="fade" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="m">
          <rect width="640" height="320" fill="url(#fade)" />
        </mask>
      </defs>
      <g mask="url(#m)">
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#2a3052" />
        ))}
      </g>
      <path d={ROUTE} fill="none" stroke="#1c2138" strokeWidth="6" strokeLinecap="round" />
      <motion.path
        id="route-path"
        d={ROUTE}
        fill="none"
        stroke="url(#route)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 2.2, ease: EASE }}
      />
      {SITES.map((s, i) => (
        <g key={s.name}>
          {!reduced && (
            <circle cx={s.x} cy={s.y} r="8" fill="none" stroke={i === 0 ? '#ff9a52' : '#8b8cff'} strokeWidth="1.5">
              <animate attributeName="r" values="8;22" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={s.x} cy={s.y} r="7" fill={i === 0 ? '#ff9a52' : '#8b8cff'} stroke="#05060d" strokeWidth="3" />
          <text x={s.x} y={s.y - 16} textAnchor="middle" fill="#aab1cd" fontSize="12" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight="600">
            {s.name}
          </text>
        </g>
      ))}
      {inView && !reduced && (
        <g>
          <circle r="9" fill="#22d3ee" opacity="0.25">
            <animateMotion dur="9s" repeatCount="indefinite" begin="2.2s" rotate="auto">
              <mpath href="#route-path" />
            </animateMotion>
          </circle>
          <circle r="5" fill="#eef1ff">
            <animateMotion dur="9s" repeatCount="indefinite" begin="2.2s" rotate="auto">
              <mpath href="#route-path" />
            </animateMotion>
          </circle>
        </g>
      )}
    </svg>
  )
}

export function CommandCenter() {
  const now = useNowSecs()
  const working = TEAM.filter((m) => m.status !== 'pause').length

  return (
    <section id="controle" className="relative py-24 sm:py-32">
      <Container>
        <SectionHead
          eyebrow="Centre de contrôle"
          title={
            <>
              Toute l’équipe, <span className="text-plasma">en direct.</span>
            </>
          }
          intro="Qui travaille, sur quel chantier, depuis quand, et où roule la camionnette. Le bureau voit tout, sans un seul coup de téléphone."
        />
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[1.75rem] shadow-card">
            <div className="beam absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2" aria-hidden />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                </span>
                <span className="font-mono text-xs tracking-[0.14em] text-mute uppercase">Tempora · En direct</span>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 font-mono text-[0.7rem] font-bold tracking-wider text-accent uppercase">
                <Radio className="size-3.5" aria-hidden /> Démo · données d’exemple
              </span>
            </div>

            <div className="grid lg:grid-cols-[1.5fr_1fr]">
              <div className="border-b border-line p-4 sm:p-6 lg:border-r lg:border-b-0">
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    [`${working} au travail`, 'text-ok bg-ok-tint'],
                    ['1 en pause', 'text-accent bg-accent-tint'],
                    ['5 chantiers aujourd’hui', 'text-primary bg-primary-tint'],
                  ].map(([l, c]) => (
                    <span key={l} className={`rounded-full px-3 py-1 text-sm font-semibold ${c}`}>
                      {l}
                    </span>
                  ))}
                </div>
                <Map />
              </div>

              <ul className="divide-y divide-line" aria-label="Équipe en direct (exemple)">
                {TEAM.map((m) => {
                  const Icon = m.status === 'pause' ? Coffee : m.status === 'drive' ? Truck : null
                  return (
                    <li key={m.name} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan text-sm font-bold text-on-primary">
                        {m.name.split(' ').map((w) => w[0]).join('')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{m.name}</p>
                        <p className="truncate text-sm text-mute">{m.site}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold text-ink tabular-nums">{fmt(now > m.start ? now - m.start : 3 * 3600 + 12 * 60)}</p>
                        <p className={`flex items-center justify-end gap-1 text-xs font-bold uppercase ${m.status === 'pause' ? 'text-accent' : m.status === 'drive' ? 'text-cyan' : 'text-ok'}`}>
                          {Icon && <Icon className="size-3.5" aria-hidden />}
                          {m.status === 'pause' ? 'En pause' : m.status === 'drive' ? 'En route' : 'Au travail'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
