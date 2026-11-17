import { motion } from 'motion/react'
import {
  CalendarClock, Camera, Car, FileText, Fingerprint, HardHat, MessageCircle, Plane, Radio, Route, ShieldCheck, Smartphone, WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { EASE } from './motion'
import { Container, SectionHead } from './ui'

const SECTORS = ['BTP & construction', 'Nettoyage', 'Horeca', 'Espaces verts', 'Rénovation', 'Commerce', 'Services à domicile', 'Logistique']

type F = { icon: ReactNode; title: string; text: string; span: string; tag?: string }

const FEATURES: F[] = [
  { icon: <Fingerprint />, title: 'Pointage en un geste', text: 'Démarrer, mettre en pause, arrêter : un seul bouton, choix du chantier, ajout manuel facilité si un oubli arrive.', span: 'lg:col-span-2', tag: 'Employés' },
  { icon: <Radio />, title: 'Vue en direct', text: 'Qui travaille, où et depuis quand, mis à jour en temps réel. Arrêt forcé en cas d’oubli.', span: '', tag: 'Gérants' },
  { icon: <CalendarClock />, title: 'Planning automatique', text: 'Tempora propose le planning de la semaine selon les chantiers, les congés, les compétences, les conducteurs et les affinités de chacun.', span: '', tag: 'Gain de temps' },
  { icon: <Route />, title: 'Tournées optimisées', text: 'L’ordre des chantiers est calculé pour réduire les trajets, avec l’itinéraire prêt dans le GPS.', span: '' },
  { icon: <Car />, title: 'Kilomètres & carburant', text: 'Kilomètres calculés automatiquement, pleins de carburant par véhicule et coût des trajets.', span: '' },
  { icon: <HardHat />, title: 'Chantiers & photos', text: 'Fiches chantier avec adresse, rendez-vous, durée des tâches, photos et heures passées par chantier.', span: 'lg:col-span-2' },
  { icon: <Plane />, title: 'Congés', text: 'Demandes et validations de congés, directement reliées au planning.', span: '' },
  { icon: <FileText />, title: 'Rapports PDF', text: 'Rapports d’heures, soldes mensuels, heures manquantes et trajets, exportés en PDF professionnel.', span: '' },
  { icon: <MessageCircle />, title: 'Messagerie d’équipe', text: 'Conversations intégrées et notifications : fini les groupes WhatsApp éparpillés.', span: '' },
  { icon: <Camera />, title: 'Retours clients', text: 'Les remarques des clients arrivent au bon endroit et se suivent jusqu’à leur résolution.', span: '' },
  { icon: <WifiOff />, title: 'Fonctionne sans réseau', text: 'Pas de 4G au fond du chantier ? Le pointage est enregistré et envoyé dès le retour du réseau.', span: '' },
  { icon: <ShieldCheck />, title: 'Contrôle & confidentialité', text: 'Journal d’audit des pointages, comptes validés par l’administrateur et politique de confidentialité RGPD.', span: '' },
  { icon: <Smartphone />, title: 'Applis Android & iPhone', text: 'Une appli installable sur tous les téléphones, et la même interface sur ordinateur pour le bureau.', span: 'lg:col-span-2' },
]

export function Features() {
  return (
    <>
      <section aria-label="Secteurs" className="border-y border-line bg-sunken py-6">
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.ul
            className="flex w-max gap-10 pr-10"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 35, ease: 'linear', repeat: Infinity }}
          >
            {[...SECTORS, ...SECTORS].map((s, i) => (
              <li key={i} aria-hidden={i >= SECTORS.length} className="flex items-center gap-10 text-lg font-semibold whitespace-nowrap text-mute">
                {s}
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section id="fonctionnalites" className="py-24 sm:py-32">
        <Container>
          <SectionHead
            eyebrow="Fonctionnalités"
            title="Tout ce qu’il faut pour gérer une équipe de terrain"
            intro="Plus qu’une pointeuse : Tempora remplace les feuilles d’heures, le tableau de planning et les calculs de kilomètres."
          />
          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {FEATURES.map((f) => (
              <motion.li
                key={f.title}
                variants={{ hidden: { opacity: 0.001, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                whileHover={{ y: -4 }}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
                  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
                }}
                className={`spotlight group flex flex-col rounded-2xl border border-line bg-surface/70 p-6 ${f.span}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-tint text-primary transition-transform duration-300 group-hover:scale-110 [&>svg]:size-5" aria-hidden>
                    {f.icon}
                  </span>
                  {f.tag && <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-bold text-accent">{f.tag}</span>}
                </div>
                <h3 className="mt-5 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-[0.98rem] text-soft">{f.text}</p>
              </motion.li>
            ))}
          </motion.ul>
        </Container>
      </section>
    </>
  )
}
