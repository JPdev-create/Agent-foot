import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { img } from '../data'
import { Container, Phone, Reveal, SectionHead } from './ui'

const SCREENS = [
  { file: '01-pointage.png', label: 'Pointage', who: 'Employé', text: 'Un gros bouton pour démarrer la journée, le chrono et le planning de la semaine juste en dessous.' },
  { file: '02-planning-semaine.png', label: 'Planning', who: 'Employé', text: 'Chaque employé voit ses chantiers jour par jour, avec les horaires et les collègues.' },
  { file: '03-historique-km.png', label: 'Historique & km', who: 'Employé', text: 'Heures prestées et kilomètres parcourus, calculés automatiquement.' },
  { file: '04-chantiers.png', label: 'Chantiers', who: 'Gérant', text: 'Tous les chantiers avec leur adresse, leurs infos et les heures passées.' },
  { file: '05-en-direct.png', label: 'En direct', who: 'Gérant', text: 'Les pointages de toute l’équipe en temps réel, sans recharger la page.' },
  { file: '06-equipe.png', label: 'Équipe', who: 'Gérant', text: 'Les fiches de l’équipe : contrats, compétences, conducteurs et congés.' },
]

export function Screens() {
  const [i, setI] = useState(0)
  const s = SCREENS[i]
  return (
    <section id="ecrans" className="border-y border-line bg-sunken py-24 sm:py-32">
      <Container>
        <SectionHead eyebrow="Aperçu" title="Simple pour l’équipe, complet pour le bureau" intro="Deux espaces dans la même appli : celui des employés, et celui des gérants." />
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
          <Reveal>
            <div role="tablist" aria-label="Écrans de l’application" className="grid gap-2 sm:grid-cols-2">
              {SCREENS.map((sc, k) => (
                <button
                  key={sc.file}
                  role="tab"
                  id={`tab-${k}`}
                  aria-selected={k === i}
                  aria-controls="ecran-panel"
                  onClick={() => setI(k)}
                  className={`relative min-h-11 cursor-pointer rounded-2xl border p-5 text-left transition-colors ${
                    k === i ? 'border-primary bg-surface shadow-card' : 'border-transparent hover:border-line hover:bg-surface/60'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{sc.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sc.who === 'Gérant' ? 'bg-accent-tint text-accent' : 'bg-primary-tint text-primary'}`}>{sc.who}</span>
                  </span>
                  <span className="mt-1.5 block text-[0.95rem] text-soft">{sc.text}</span>
                </button>
              ))}
            </div>
          </Reveal>
          <div id="ecran-panel" role="tabpanel" aria-labelledby={`tab-${i}`} className="mx-auto w-64 sm:w-72">
            <AnimatePresence mode="wait">
              <motion.div key={s.file} initial={{ opacity: 0, y: 16, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -16, rotate: 2 }} transition={{ duration: 0.35 }}>
                <Phone src={img(s.file)} alt={`Écran ${s.label} de Tempora`} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  )
}
