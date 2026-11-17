import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Plus, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Container, Reveal, SectionHeading } from './ui'
import { EASE } from './motion'

const FAQ = [
  { q: 'Le jeu est-il gratuit ?', a: 'Oui, entièrement. Aucun achat, aucune publicité, aucun compte à créer.' },
  { q: 'Faut-il installer quelque chose ?', a: 'Non. Le jeu tourne dans le navigateur, sur ordinateur comme sur mobile, et peut s’installer comme une application (PWA) si tu le souhaites.' },
  { q: 'Où est sauvegardée ma partie ?', a: 'Automatiquement dans ton navigateur, avec 3 emplacements de sauvegarde. Tu peux aussi exporter et importer ta sauvegarde pour changer d’appareil.' },
  { q: 'Comment l’agence gagne-t-elle de l’argent ?', a: 'Tu touches une commission sur le salaire de tes clients (5, 7 ou 10 % selon la négociation) et 10 % des indemnités de transfert.' },
  { q: 'Quand peut-on transférer un joueur ?', a: 'Pendant le mercato : semaines 1 à 6 en été et 20 à 23 en hiver. Le bouton « jusqu’au mercato » fait avancer le temps directement.' },
  { q: 'Y a-t-il une fin de partie ?', a: 'Pas vraiment : une fois l’agence au sommet, tu peux racheter un club et passer en mode président, tout en entretenant ta réputation.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <li className="rounded-2xl border border-line bg-surface transition-colors hover:border-lime/40">
      <h3 className="font-sans text-base">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-lg font-semibold text-ink"
        >
          {q}
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25 }} className="grid size-8 shrink-0 place-items-center rounded-full bg-lime/10 text-lime">
            <Plus className="size-4" aria-hidden />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-ink-soft">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

type Errors = Partial<Record<'name' | 'email' | 'message', string>>

function ContactForm() {
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()
    const next: Errors = {}
    if (name.length < 2) next.name = 'Indique ton nom.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Adresse e-mail invalide.'
    if (message.length < 10) next.message = 'Ton message doit faire au moins 10 caractères.'
    setErrors(next)
    // Aucun back-end n’est branché : brancher ici un service d’envoi (Formspree, API, etc.).
    if (Object.keys(next).length === 0) setSent(true)
  }

  const field =
    'mt-2 block min-h-12 w-full rounded-xl border bg-pitch px-4 py-3 text-ink placeholder:text-ink-mute transition-colors focus:border-lime focus:outline-none focus:ring-2 focus:ring-lime/30'

  return (
    <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-80 flex-col items-center justify-center text-center" role="status">
            <CheckCircle2 className="size-14 text-lime" aria-hidden />
            <p className="mt-4 font-display text-4xl text-ink">Message prêt !</p>
            <p className="mt-2 max-w-sm text-ink-soft">Merci. Ce formulaire n’est pas encore relié à une boîte mail : ton message n’a pas été transmis.</p>
            <button type="button" onClick={() => setSent(false)} className="mt-6 cursor-pointer text-lime underline underline-offset-4">
              Écrire un autre message
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" exit={{ opacity: 0 }} onSubmit={onSubmit} noValidate className="space-y-5">
            {(
              [
                ['name', 'Nom', 'text', 'Ton nom ou pseudo', 'name'],
                ['email', 'E-mail', 'email', 'toi@exemple.be', 'email'],
              ] as const
            ).map(([n, label, type, ph, ac]) => (
              <div key={n}>
                <label htmlFor={n} className="text-sm font-semibold text-ink">{label}</label>
                <input id={n} name={n} type={type} placeholder={ph} autoComplete={ac} aria-invalid={!!errors[n]} aria-describedby={errors[n] ? `${n}-err` : undefined} className={`${field} ${errors[n] ? 'border-red' : 'border-line'}`} />
                {errors[n] && <p id={`${n}-err`} className="mt-1.5 text-sm text-red">{errors[n]}</p>}
              </div>
            ))}
            <div>
              <label htmlFor="subject" className="text-sm font-semibold text-ink">Sujet</label>
              <select id="subject" name="subject" className={`${field} border-line`}>
                <option>Idée de fonctionnalité</option>
                <option>Signaler un bug</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="text-sm font-semibold text-ink">Message</label>
              <textarea id="message" name="message" rows={4} placeholder="Raconte-nous…" aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-err' : undefined} className={`${field} resize-y ${errors.message ? 'border-red' : 'border-line'}`} />
              {errors.message && <p id="message-err" className="mt-1.5 text-sm text-red">{errors.message}</p>}
            </div>
            <motion.button
              type="submit"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime font-semibold text-night shadow-glow transition-colors hover:bg-lime-strong"
            >
              Envoyer <Send className="size-4" aria-hidden />
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FaqContact() {
  return (
    <>
      <section id="faq" className="py-24 sm:py-32">
        <Container>
          <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
          <Reveal>
            <ul className="mx-auto grid max-w-3xl gap-3">
              {FAQ.map((f) => (
                <FaqItem key={f.q} {...f} />
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section id="contact" className="border-t border-line bg-pitch py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-lime">Contact</p>
            <h2 className="text-5xl text-ink sm:text-7xl">
              Une idée ? <br />
              <span className="text-gradient">Un bug ?</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-ink-soft">
              Agent Foot évolue à chaque mise à jour grâce aux retours des joueurs. Dis-nous ce qui te manque, ce qui coince ou ce qui t’a fait vibrer.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </Container>
      </section>
    </>
  )
}
