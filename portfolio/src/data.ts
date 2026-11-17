// ===== Contenu du portfolio : modifie ici tes infos, liens et projets =====

export const PROFILE = {
  firstName: 'Jason',
  lastName: 'Pougin',
  role: 'Créateur de jeux & d’expériences web',
  location: 'Belgique',
  available: true,
  // Renseigne tes liens publics : les boutons correspondants n’apparaissent que s’ils sont remplis.
  email: '',
  github: '',
  linkedin: '',
}

export type Project = {
  id: string
  index: string
  title: string
  kind: string
  year: string
  summary: string
  points: string[]
  stack: string[]
  image: string
  device: 'phone' | 'browser'
  url: string
  accent: string
}

export const PROJECTS: Project[] = [
  {
    id: 'agent-foot',
    index: '01',
    title: 'Agent Foot',
    kind: 'Jeu de gestion · Navigateur & mobile',
    year: '2026',
    summary:
      'Un jeu de gestion où l’on dirige une agence de joueurs belge : détection des pépites, négociations à paliers, mercato, coupes d’Europe et cérémonie des trophées.',
    points: [
      '7 championnats simulés chaque semaine',
      'Négociation en tours, enchères, prêts',
      'PWA installable, 3 sauvegardes, thème clair/sombre',
      'Plus de 3 000 lignes de JavaScript, zéro dépendance',
    ],
    stack: ['JavaScript', 'HTML/CSS', 'PWA', 'Service Worker'],
    image: '/projets/agent-foot-jeu.jpg',
    device: 'phone',
    url: '',
    accent: '#22d3ee',
  },
  {
    id: 'agent-foot-site',
    index: '02',
    title: 'Agent Foot — Site vitrine',
    kind: 'Landing page · Marketing',
    year: '2026',
    summary:
      'La page de lancement du jeu : hero animé, grille de fonctionnalités, frise de carrière qui se remplit au scroll, FAQ et formulaire de contact.',
    points: ['Design system dédié', 'Animations au scroll avec Motion', 'Accessibilité et responsive soignés'],
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Motion'],
    image: '/projets/agent-foot-vitrine.jpg',
    device: 'browser',
    url: '',
    accent: '#a78bfa',
  },
]

export const SKILLS = [
  { group: 'Game design', items: ['Systèmes de progression', 'Économie de jeu', 'Simulation', 'Équilibrage'] },
  { group: 'Front-end', items: ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS'] },
  { group: 'Expériences', items: ['Three.js', 'React Three Fiber', 'Motion', 'Micro-interactions'] },
  { group: 'Produit', items: ['PWA', 'Responsive', 'Accessibilité', 'Itérations rapides'] },
]

export const PROCESS = [
  { n: '01', title: 'Idée', text: 'Partir d’une envie de joueur ou d’un besoin réel, et la résumer en une boucle simple.' },
  { n: '02', title: 'Prototype', text: 'Une version jouable au plus vite, pour sentir ce qui fonctionne vraiment.' },
  { n: '03', title: 'Itération', text: 'Mises à jour fréquentes : nouvelles mécaniques, peaufinage, retours des joueurs.' },
  { n: '04', title: 'Lancement', text: 'Une vitrine soignée, rapide et accessible pour donner envie dès la première seconde.' },
]
