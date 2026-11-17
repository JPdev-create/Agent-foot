// ===== Tarifs et contenus de Tempora : modifie ici les prix et les textes =====

export const BRAND = 'Tempora'
export const TRIAL_DAYS = 30

export const SUBSCRIPTION = {
  pricePerEmployee: 6.9, // € HTVA par employé et par mois
}

export const LIFETIME_TIERS = [
  { id: 'equipe', name: 'Équipe', maxEmployees: 10, price: 1990 },
  { id: 'entreprise', name: 'Entreprise', maxEmployees: 30, price: 4990 },
] as const

export const MAINTENANCE_RATE = 0.15 // maintenance annuelle facultative : 15 % du prix d'achat

export const img = (name: string) => `${import.meta.env.BASE_URL}ecrans/${name}`

export const euro = (n: number, digits = 0) =>
  n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits })
