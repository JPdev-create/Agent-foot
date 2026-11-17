import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { BRAND, LIFETIME_TIERS, MAINTENANCE_RATE, SUBSCRIPTION, TRIAL_DAYS, euro } from '../data'
import { EASE } from './motion'
import { Logo } from './Navbar'
import { Container, Reveal, SectionHead } from './ui'

const STEPS = [
  { title: 'Créez votre espace', text: 'Remplissez le formulaire d’essai : votre espace est prêt et nous vous accompagnons pour le configurer.' },
  { title: 'Invitez votre équipe', text: 'Chaque employé installe l’appli sur son téléphone et crée son compte, que vous validez.' },
  { title: 'Pointez dès le lendemain', text: 'Ajoutez vos chantiers, lancez le planning automatique, et suivez tout en direct.' },
]

export function Steps() {
  return (
    <section className="border-y border-line bg-surface py-24 sm:py-28">
      <Container>
        <SectionHead eyebrow="Mise en route" title="Opérationnel en une journée" />
        <ol className="relative grid gap-8 md:grid-cols-3">
          <motion.span
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: EASE }}
            className="absolute top-6 right-[16%] left-[16%] hidden h-0.5 origin-left bg-primary/30 md:block"
            aria-hidden
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.12}>
              <li className="relative text-center">
                <span className="relative z-10 mx-auto grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan shadow-[0_0_30px_-4px_rgb(34_211_238/0.6)] font-mono text-lg font-bold text-on-primary">{i + 1}</span>
                <h3 className="mt-5 text-xl font-bold text-ink">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-soft">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}

const FAQ = [
  { q: `Que se passe-t-il après les ${TRIAL_DAYS} jours d’essai ?`, a: `Vous choisissez : l’abonnement à ${euro(SUBSCRIPTION.pricePerEmployee, 2)} par employé et par mois, ou l’achat à vie. Si vous ne choisissez rien, votre espace est simplement mis en pause.` },
  { q: 'Quelle différence entre l’abonnement et l’achat à vie ?', a: `Les fonctionnalités sont les mêmes. L’abonnement se paie chaque mois selon le nombre d’employés et inclut les mises à jour. L’achat à vie se paie une fois (${LIFETIME_TIERS.map((t) => `${euro(t.price)} jusqu’à ${t.maxEmployees} employés`).join(', ')}) ; la maintenance annuelle (${Math.round(MAINTENANCE_RATE * 100)} % du prix) est facultative.` },
  { q: 'Que comprend la maintenance de l’achat à vie ?', a: 'Les nouvelles fonctionnalités, les corrections et le support. Sans maintenance, votre version continue de fonctionner telle quelle.' },
  { q: 'Mes employés ont-ils besoin d’un smartphone récent ?', a: 'Non. Tempora fonctionne sur Android, iPhone, tablette et ordinateur, et continue d’enregistrer les pointages sans réseau.' },
  { q: 'Où sont stockées les données ?', a: 'Sur une infrastructure cloud sécurisée. Chaque employé ne voit que ses propres pointages, et seuls les administrateurs voient ceux de l’équipe.' },
  { q: 'Peut-on adapter Tempora à mon métier ?', a: 'Oui. Tempora est né sur des chantiers, mais il s’adapte à toute équipe qui se déplace ou travaille en horaires variables. Parlez-nous de vos besoins.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <li className="border-b border-line">
      <h3>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-lg font-semibold text-ink">
          {q}
          <motion.span animate={{ rotate: open ? 45 : 0 }} className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
            <Plus className="size-4" aria-hidden />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <p className="pb-5 text-soft">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function Faq() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHead eyebrow="FAQ" title="Questions fréquentes" intro="Une autre question ? Posez-la dans le formulaire d’essai, nous répondons à tout." center={false} />
        <Reveal>
          <ul className="border-t border-line">
            {FAQ.map((f) => (
              <FaqItem key={f.q} {...f} />
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  )
}

type Errors = Partial<Record<'company' | 'name' | 'email' | 'employees', string>>

export function Trial() {
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    const v = (k: string) => String(d.get(k) ?? '').trim()
    const next: Errors = {}
    if (v('company').length < 2) next.company = 'Indiquez le nom de votre entreprise.'
    if (v('name').length < 2) next.name = 'Indiquez votre nom.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) next.email = 'Adresse e-mail invalide (exemple : nom@entreprise.be).'
    if (!(Number(v('employees')) >= 1)) next.employees = 'Indiquez au moins 1 employé.'
    setErrors(next)
    // Aucun back-end branché : relier ici l’envoi (Formspree, e-mail, création de compte…).
    if (Object.keys(next).length === 0) setSent(true)
  }

  const field = (err?: string) =>
    `mt-1.5 block min-h-12 w-full rounded-xl border bg-bg px-4 py-3 text-ink placeholder:text-mute focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ${err ? 'border-accent' : 'border-line'}`

  const inputs = [
    ['company', 'Entreprise', 'text', 'organization', 'Ex. Dupont Rénovation'],
    ['name', 'Votre nom', 'text', 'name', 'Prénom et nom'],
    ['email', 'E-mail professionnel', 'email', 'email', 'nom@entreprise.be'],
    ['employees', 'Nombre d’employés', 'number', 'off', '8'],
  ] as const

  return (
    <section id="essai" className="relative overflow-hidden border-t border-line bg-gradient-to-b from-sunken to-[#0d0b24] py-24 text-ink sm:py-32">
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-[34rem] rounded-full bg-[#4f46e5]/40 blur-[120px]" aria-hidden />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-bold tracking-[0.12em] text-accent uppercase">Essai gratuit</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-[2.6rem]">{TRIAL_DAYS} jours pour l’adopter.</h2>
          <p className="mt-5 max-w-md text-lg opacity-80">
            Testez {BRAND} avec toute votre équipe pendant un mois complet, sur un vrai cycle de paie. Sans engagement.
          </p>
          <ul className="mt-8 space-y-3 opacity-90">
            {['Toutes les fonctionnalités débloquées', 'Accompagnement pour la mise en route', 'Choix de la formule à la fin de l’essai'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-ok" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-line bg-surface p-6 text-ink shadow-card sm:p-8">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} role="status" className="flex min-h-96 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="size-14 text-ok" aria-hidden />
                  <p className="mt-4 text-2xl font-extrabold">Demande prête</p>
                  <p className="mt-2 max-w-sm text-soft">Ce formulaire n’est pas encore relié à une boîte mail : votre demande n’a pas été transmise.</p>
                  <button type="button" onClick={() => setSent(false)} className="mt-6 min-h-11 cursor-pointer font-semibold text-primary underline underline-offset-4">
                    Modifier la demande
                  </button>
                </motion.div>
              ) : (
                <motion.form key="f" exit={{ opacity: 0 }} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
                  {inputs.map(([n, label, type, ac, ph]) => (
                    <div key={n} className={n === 'email' ? 'sm:col-span-2' : ''}>
                      <label htmlFor={`f-${n}`} className="text-sm font-semibold">{label}</label>
                      <input id={`f-${n}`} name={n} type={type} autoComplete={ac} placeholder={ph} min={type === 'number' ? 1 : undefined} inputMode={type === 'number' ? 'numeric' : undefined} aria-invalid={!!errors[n]} aria-describedby={errors[n] ? `e-${n}` : undefined} className={field(errors[n])} />
                      {errors[n] && <p id={`e-${n}`} className="mt-1 text-sm text-accent">{errors[n]}</p>}
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label htmlFor="f-plan" className="text-sm font-semibold">Formule envisagée</label>
                    <select id="f-plan" name="plan" className={field()}>
                      <option>Je ne sais pas encore</option>
                      <option>Abonnement mensuel</option>
                      <option>Achat à vie</option>
                    </select>
                  </div>
                  <motion.button type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="min-h-12 cursor-pointer rounded-xl bg-gradient-to-r from-primary to-cyan font-semibold text-on-primary hover:brightness-110 sm:col-span-2">
                    Démarrer mon essai gratuit
                  </motion.button>
                  <p className="text-center text-sm text-mute sm:col-span-2">Sans engagement · {TRIAL_DAYS} jours gratuits</p>
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
    <footer className="border-t border-line bg-bg py-12">
      <Container className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-soft">La pointeuse en ligne pour les équipes de terrain. Pointage, planning, chantiers et kilomètres.</p>
        </div>
        <nav aria-label="Produit">
          <p className="font-bold text-ink">Produit</p>
          <ul className="mt-3 space-y-2 text-soft">
            {[['#fonctionnalites', 'Fonctionnalités'], ['#ecrans', 'Aperçu'], ['#tarifs', 'Tarifs']].map(([h, l]) => (
              <li key={h}><a href={h} className="hover:text-primary">{l}</a></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Aide">
          <p className="font-bold text-ink">Aide</p>
          <ul className="mt-3 space-y-2 text-soft">
            {[['#faq', 'FAQ'], ['#essai', 'Essai gratuit'], ['#essai', 'Nous contacter']].map(([h, l]) => (
              <li key={l}><a href={h} className="hover:text-primary">{l}</a></li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="mt-10 border-t border-line pt-6 text-sm text-mute">
        © {YEAR} {BRAND}. Prix indiqués hors TVA.
      </Container>
    </footer>
  )
}
