import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, ArrowUpRight, CheckCircle2, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PROFILE } from '../data'
import { Monogram } from './Navbar'
import { Container, Reveal } from './ui'

type Errors = Partial<Record<'name' | 'email' | 'message', string>>

export function Contact() {
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const name = String(d.get('name') ?? '').trim()
    const email = String(d.get('email') ?? '').trim()
    const message = String(d.get('message') ?? '').trim()
    const next: Errors = {}
    if (name.length < 2) next.name = 'Indique ton nom.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Adresse e-mail invalide.'
    if (message.length < 10) next.message = 'Au moins 10 caractères, s’il te plaît.'
    setErrors(next)
    // Aucun back-end branché : relier ici un service d’envoi (Formspree, Resend, API…).
    if (Object.keys(next).length === 0) setSent(true)
  }

  const input =
    'peer block min-h-14 w-full rounded-2xl border bg-white/[0.03] px-5 pt-6 pb-2 text-ink placeholder-transparent transition-colors focus:border-cyan focus:bg-white/[0.05] focus:outline-none'
  const label =
    'pointer-events-none absolute top-2 left-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-mute transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[0.68rem] peer-focus:uppercase peer-focus:tracking-[0.18em] peer-focus:text-cyan'

  const fields = [
    ['name', 'Nom', 'text', 'name'],
    ['email', 'E-mail', 'email', 'email'],
  ] as const

  return (
    <section id="contact" className="relative overflow-hidden py-28 sm:py-40">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute bottom-[-30%] left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-violet/20 blur-[160px]" />
      </div>
      <Container className="relative grid gap-14 lg:grid-cols-2 lg:gap-24">
        <div>
          <Reveal>
            <p className="hud flex items-center gap-3">
              <span className="text-cyan">04</span>
              <span className="h-px w-10 bg-edge" aria-hidden />
              Contact
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 text-5xl font-semibold text-ink sm:text-7xl lg:text-8xl">
              Créons <br />
              <span className="text-holo">le futur.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-md text-lg text-ink-soft">
              Un jeu, un site, une expérience interactive ? Raconte-moi ton idée : je réponds à chaque message.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {(
                [
                  ['E-mail', PROFILE.email ? `mailto:${PROFILE.email}` : ''],
                  ['GitHub', PROFILE.github],
                  ['LinkedIn', PROFILE.linkedin],
                ] as const
              )
                .filter(([, href]) => href)
                .map(([l, href]) => (
                  <a key={l} href={href} target="_blank" rel="noreferrer" className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-ink hover:border-cyan/50">
                    {l} <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="glass relative rounded-[2rem] p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-96 flex-col items-center justify-center text-center" role="status">
                  <CheckCircle2 className="size-14 text-cyan" aria-hidden />
                  <p className="mt-5 text-3xl font-semibold text-ink">Message prêt !</p>
                  <p className="mt-3 max-w-sm text-ink-soft">Le formulaire n’est pas encore relié à une boîte mail : ton message n’a pas été transmis.</p>
                  <button type="button" onClick={() => setSent(false)} className="mt-6 min-h-11 cursor-pointer text-cyan underline underline-offset-4">
                    Écrire un autre message
                  </button>
                </motion.div>
              ) : (
                <motion.form key="f" exit={{ opacity: 0 }} onSubmit={onSubmit} noValidate className="space-y-4">
                  {fields.map(([n, l, type, ac]) => (
                    <div key={n}>
                      <div className="relative">
                        <input id={n} name={n} type={type} autoComplete={ac} placeholder={l} aria-invalid={!!errors[n]} aria-describedby={errors[n] ? `${n}-e` : undefined} className={`${input} ${errors[n] ? 'border-magenta' : 'border-white/10'}`} />
                        <label htmlFor={n} className={label}>{l}</label>
                      </div>
                      {errors[n] && <p id={`${n}-e`} className="mt-1.5 pl-2 text-sm text-magenta">{errors[n]}</p>}
                    </div>
                  ))}
                  <fieldset>
                    <legend className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-mute">Type de projet</legend>
                    <div className="flex flex-wrap gap-2">
                      {['Jeu', 'Site web', 'Expérience 3D', 'Autre'].map((t, i) => (
                        <label key={t} className="cursor-pointer">
                          <input type="radio" name="type" value={t} defaultChecked={i === 0} className="peer sr-only" />
                          <span className="inline-flex min-h-11 items-center rounded-full border border-white/10 px-4 text-sm text-ink-soft transition-colors peer-checked:border-cyan peer-checked:bg-cyan/10 peer-checked:text-cyan peer-focus-visible:outline-2 peer-focus-visible:outline-cyan hover:border-white/30">
                            {t}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div>
                    <div className="relative">
                      <textarea id="message" name="message" rows={4} placeholder="Ton message" aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-e' : undefined} className={`${input} resize-y pt-7 ${errors.message ? 'border-magenta' : 'border-white/10'}`} />
                      <label htmlFor="message" className={label}>Ton message</label>
                    </div>
                    {errors.message && <p id="message-e" className="mt-1.5 pl-2 text-sm text-magenta">{errors.message}</p>}
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan to-violet font-semibold text-void"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
                    <span className="relative">Envoyer le message</span>
                    <Send className="relative size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10">
      <Container className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <Monogram />
        <p className="hud text-center">© {YEAR} {PROFILE.firstName} {PROFILE.lastName} · Conçu et développé en {PROFILE.location}</p>
        <motion.a href="#top" whileHover={{ y: -3 }} className="glass grid size-11 place-items-center rounded-full text-ink hover:border-cyan/50" aria-label="Retour en haut">
          <ArrowUp className="size-4" aria-hidden />
        </motion.a>
      </Container>
    </footer>
  )
}
