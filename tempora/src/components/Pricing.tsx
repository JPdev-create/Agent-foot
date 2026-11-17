import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, Infinity as InfinityIcon, RefreshCw } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { LIFETIME_TIERS, MAINTENANCE_RATE, SUBSCRIPTION, TRIAL_DAYS, euro } from '../data'
import { Button, Container, Reveal, SectionHead } from './ui'

function AnimatedEuro({ value, digits = 0 }: { value: number; digits?: number }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => euro(v, digits))
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.4, ease: 'easeOut' })
    return () => c.stop()
  }, [value, mv])
  return <motion.span className="tabular-nums">{text}</motion.span>
}

const SUB_FEATURES = ['Toutes les fonctionnalités', 'Applis Android, iPhone et ordinateur', 'Hébergement sécurisé inclus', 'Mises à jour et support inclus', 'Sans engagement, résiliable chaque mois']
const LIFE_FEATURES = ['Toutes les fonctionnalités', 'Votre logo et vos couleurs', 'Installation et mise en route incluses', 'Paiement unique, à vous pour toujours', `Maintenance facultative : ${Math.round(MAINTENANCE_RATE * 100)} % du prix par an`]

export function Pricing() {
  const [n, setN] = useState(8)
  const sliderId = useId()
  const monthly = n * SUBSCRIPTION.pricePerEmployee
  const yearly = monthly * 12
  const tier = LIFETIME_TIERS.find((t) => n <= t.maxEmployees)
  const breakEven = tier ? tier.price / yearly : null

  return (
    <section id="tarifs" className="py-24 sm:py-32">
      <Container>
        <SectionHead
          eyebrow="Tarifs"
          title="Louez-la au mois ou achetez-la à vie"
          intro={`Deux formules, les mêmes fonctionnalités. Commencez par ${TRIAL_DAYS} jours gratuits, puis choisissez. Prix hors TVA.`}
        />

        <Reveal className="mx-auto mb-10 max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label htmlFor={sliderId} className="font-bold text-ink">
              Combien d’employés pointent ?
            </label>
            <p className="font-mono text-3xl font-semibold tabular-nums text-primary" aria-live="polite">
              {n} {n > 1 ? 'employés' : 'employé'}
            </p>
          </div>
          <input
            id={sliderId}
            type="range"
            min={1}
            max={50}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="mt-5 h-2 w-full cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-xs text-mute" aria-hidden>
            <span>1</span>
            <span>10</span>
            <span>30</span>
            <span>50</span>
          </div>
          <p className="mt-5 rounded-xl bg-sunken px-4 py-3 text-[0.98rem] text-soft">
            {tier && breakEven ? (
              <>
                Avec {n} employé{n > 1 ? 's' : ''}, l’abonnement coûte <strong className="text-ink">{euro(yearly)} par an</strong>. L’achat à vie
                ({tier.name}) est remboursé en <strong className="text-ink">{breakEven.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} ans</strong>.
              </>
            ) : (
              <>Au-delà de 30 employés, l’achat à vie se fait sur devis : contactez-nous pour un prix adapté.</>
            )}
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <Reveal>
            <motion.article whileHover={{ y: -4 }} className="flex h-full flex-col rounded-3xl border border-line bg-surface p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-tint text-primary">
                  <RefreshCw className="size-5" aria-hidden />
                </span>
                <h3 className="text-2xl font-extrabold text-ink">Abonnement</h3>
              </div>
              <p className="mt-3 text-soft">Idéal pour démarrer sans investissement, et payer selon la taille de l’équipe.</p>
              <p className="mt-7 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-ink">{euro(SUBSCRIPTION.pricePerEmployee, 2)}</span>
                <span className="text-soft">/ employé / mois</span>
              </p>
              <p className="mt-2 text-[0.95rem] text-mute">
                Pour {n} employé{n > 1 ? 's' : ''} : <span className="font-semibold text-ink"><AnimatedEuro value={monthly} digits={2} /></span> / mois
              </p>
              <ul className="mt-7 flex-1 space-y-3">
                {SUB_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-ink">
                    <Check className="mt-1 size-4 shrink-0 text-ok" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <Button href="#essai" variant="secondary" className="mt-8 w-full">
                Commencer l’essai gratuit
              </Button>
            </motion.article>
          </Reveal>

          <Reveal delay={0.08}>
            <motion.article whileHover={{ y: -4 }} className="relative flex h-full flex-col rounded-3xl border-2 border-primary bg-surface p-7 shadow-[0_0_60px_-15px_rgb(77_155_255/0.6)] sm:p-9">
              <span className="absolute -top-3.5 left-7 rounded-full bg-accent px-3 py-1 text-xs font-bold tracking-wide text-on-primary uppercase">Le plus rentable</span>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary text-on-primary">
                  <InfinityIcon className="size-5" aria-hidden />
                </span>
                <h3 className="text-2xl font-extrabold text-ink">Achat à vie</h3>
              </div>
              <p className="mt-3 text-soft">Un seul paiement, plus jamais de facture mensuelle. Rentable dès la troisième année.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {LIFETIME_TIERS.map((t) => {
                  const active = tier?.id === t.id
                  return (
                    <div key={t.id} className={`rounded-2xl border p-4 transition-colors ${active ? 'border-primary bg-primary-tint' : 'border-line'}`}>
                      <p className="text-sm font-semibold text-soft">{t.name}</p>
                      <p className="text-2xl font-extrabold text-ink tabular-nums">{euro(t.price)}</p>
                      <p className="text-xs text-mute">jusqu’à {t.maxEmployees} employés</p>
                    </div>
                  )
                })}
                <div className={`rounded-2xl border p-4 transition-colors ${!tier ? 'border-primary bg-primary-tint' : 'border-line'}`}>
                  <p className="text-sm font-semibold text-soft">Sur mesure</p>
                  <p className="text-2xl font-extrabold text-ink">Devis</p>
                  <p className="text-xs text-mute">plus de 30 employés</p>
                </div>
              </div>
              {tier && (
                <p className="mt-3 text-[0.95rem] text-mute">
                  Maintenance facultative pour {tier.name} : <span className="font-semibold text-ink">{euro(tier.price * MAINTENANCE_RATE)} / an</span> (mises à jour et support).
                </p>
              )}
              <ul className="mt-7 flex-1 space-y-3">
                {LIFE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-ink">
                    <Check className="mt-1 size-4 shrink-0 text-ok" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <Button href="#essai" className="mt-8 w-full">
                Essayer avant d’acheter
              </Button>
            </motion.article>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
