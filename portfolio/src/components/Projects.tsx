import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowUpRight, Check } from 'lucide-react'
import { useRef } from 'react'
import { PROJECTS, type Project } from '../data'
import { EASE } from './motion'
import { Container, Reveal, SectionTitle } from './ui'

/** Carte inclinable en 3D qui suit le pointeur, avec reflet lumineux. */
function TiltCard({ children, accent }: { children: React.ReactNode; accent: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 150, damping: 18 })
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 150, damping: 18 })
  const gx = useTransform(mx, (v) => `${v * 100}%`)
  const gy = useTransform(my, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(600px circle at ${gx} ${gy}, ${accent}26, transparent 45%)`

  return (
    <div className="[perspective:1400px]">
      <motion.div
        ref={ref}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse' || !ref.current) return
          const r = ref.current.getBoundingClientRect()
          mx.set((e.clientX - r.left) / r.width)
          my.set((e.clientY - r.top) / r.height)
        }}
        onPointerLeave={() => {
          mx.set(0.5)
          my.set(0.5)
        }}
        className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-panel/70"
      >
        <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0 z-10" aria-hidden />
        {children}
      </motion.div>
    </div>
  )
}

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-[230px] rounded-[2.6rem] border border-white/15 bg-gradient-to-b from-[#1b1b30] to-[#0b0b16] p-2.5 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8)] sm:w-[260px]" style={{ transform: 'translateZ(60px)' }}>
      <div className="absolute top-4 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <img src={src} alt={alt} loading="lazy" width={390} height={844} className="aspect-[390/844] w-full rounded-[2rem] object-cover object-top" />
    </div>
  )
}

function Browser({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0b0b16] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8)]" style={{ transform: 'translateZ(50px)' }}>
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="ml-3 h-5 flex-1 rounded-md bg-white/5" />
      </div>
      <img src={src} alt={alt} loading="lazy" width={1280} height={800} className="aspect-[16/10] w-full object-cover object-top" />
    </div>
  )
}

function ProjectCard({ p, flip }: { p: Project; flip: boolean }) {
  return (
    <Reveal>
      <TiltCard accent={p.accent}>
        <div className={`grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14`} style={{ transformStyle: 'preserve-3d' }}>
          <div className={flip ? 'lg:order-2' : ''} style={{ transform: 'translateZ(30px)' }}>
            <div className="hud flex flex-wrap items-center gap-x-4 gap-y-2">
              <span style={{ color: p.accent }}>{p.index}</span>
              <span>{p.kind}</span>
              <span className="text-ink-mute/70">{p.year}</span>
            </div>
            <h3 className="mt-5 text-4xl font-semibold text-ink sm:text-5xl">{p.title}</h3>
            <p className="mt-5 text-ink-soft">{p.summary}</p>
            <ul className="mt-7 space-y-3">
              {p.points.map((pt) => (
                <li key={pt} className="flex items-start gap-3 text-ink">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full" style={{ background: `${p.accent}22`, color: p.accent }}>
                    <Check className="size-3" aria-hidden />
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Technologies">
              {p.stack.map((s) => (
                <li key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-ink-soft">
                  {s}
                </li>
              ))}
            </ul>
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-ink underline decoration-white/20 underline-offset-8 hover:decoration-current" style={{ color: p.accent }}>
                Voir le projet <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
          </div>
          <div className={`relative ${flip ? 'lg:order-1' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 m-auto size-3/4 rounded-full blur-[80px]" style={{ background: `${p.accent}40` }} aria-hidden />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE, delay: 0.2 }} style={{ transformStyle: 'preserve-3d' }}>
              {p.device === 'phone' ? <Phone src={p.image} alt={`Capture d’écran de ${p.title}`} /> : <Browser src={p.image} alt={`Capture d’écran de ${p.title}`} />}
            </motion.div>
          </div>
        </div>
      </TiltCard>
    </Reveal>
  )
}

export function Projects() {
  return (
    <section id="projets" className="relative py-28 sm:py-40">
      <Container>
        <SectionTitle
          index="01"
          label="Projets sélectionnés"
          title={
            <>
              Des projets pensés <span className="text-holo">pour être joués.</span>
            </>
          }
          intro="Chaque projet part d’une boucle simple, puis grandit au fil des mises à jour, jusqu’à devenir une expérience complète."
        />
        <div className="space-y-10 lg:space-y-16">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} p={p} flip={i % 2 === 1} />
          ))}
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-white/15 p-10 text-center sm:p-14">
              <p className="hud">03 · En préparation</p>
              <p className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">Le prochain projet est en cours de construction.</p>
              <p className="mx-auto mt-3 max-w-lg text-ink-soft">Une idée à me confier ? C’est peut-être le tien.</p>
              <a href="#contact" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-cyan hover:underline">
                Proposer un projet <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
