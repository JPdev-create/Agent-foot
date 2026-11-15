/* Données statiques : championnats, clubs, noms */
'use strict';

const LEAGUES = {
  BE1: { name: 'Jupiler Pro League', country: 'BE', flag: '🇧🇪', big: false },
  BE2: { name: 'Challenger Pro League', country: 'BE', flag: '🇧🇪', big: false },
  BE3: { name: 'Nationale 1', country: 'BE', flag: '🇧🇪', big: false },
  ENG: { name: 'Premier League', country: 'EN', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', big: true },
  ESP: { name: 'La Liga', country: 'ES', flag: '🇪🇸', big: true },
  ITA: { name: 'Serie A', country: 'IT', flag: '🇮🇹', big: true },
  GER: { name: 'Bundesliga', country: 'DE', flag: '🇩🇪', big: true },
  FRA: { name: 'Ligue 1', country: 'FR', flag: '🇫🇷', big: true },
  NED: { name: 'Eredivisie', country: 'NL', flag: '🇳🇱', big: false },
  POR: { name: 'Liga Portugal', country: 'PT', flag: '🇵🇹', big: false },
};

const CLUB_LIST = {
  BE1: [['Club Bruges', 74], ['Union Saint-Gilloise', 73], ['KRC Genk', 72], ['RSC Anderlecht', 71],
    ['La Gantoise', 69], ['Royal Antwerp', 69], ['Standard de Liège', 66], ['Sporting Charleroi', 64],
    ['KV Malines', 64], ['Westerlo', 63], ['OH Louvain', 63], ['Cercle Bruges', 63],
    ['Saint-Trond', 62], ['Zulte Waregem', 60], ['FCV Dender', 59], ['RAAL La Louvière', 59]],
  BE2: [['KV Courtrai', 57], ['RWDM Brussels', 56], ['SK Beveren', 55], ['Beerschot', 55],
    ['Lommel SK', 55], ['KAS Eupen', 54], ['Patro Eisden', 53], ['RFC Liège', 53],
    ['Lierse', 52], ['Lokeren', 52], ['RFC Seraing', 50], ['Francs Borains', 50]],
  BE3: [['Olympic Charleroi', 47], ['Excelsior Virton', 45], ['Tubize-Braine', 45], ['KVK Tirlemont', 45],
    ['Dessel Sport', 45], ['UR Namur', 44], ['RAEC Mons', 44], ['URSL Visé', 44],
    ['RFC Meux', 42], ['Union Rochefort', 42]],
  ENG: [['Manchester City', 93], ['Arsenal', 93], ['Liverpool', 93], ['Chelsea', 89],
    ['Manchester United', 86], ['Tottenham', 86], ['Newcastle', 86], ['Aston Villa', 85],
    ['Brighton', 82], ['Crystal Palace', 81], ['Nottingham Forest', 81], ['West Ham', 80],
    ['Bournemouth', 80], ['Fulham', 79], ['Brentford', 79], ['Everton', 79],
    ['Wolverhampton', 77], ['Leeds United', 77], ['Sunderland', 76], ['Burnley', 75]],
  ESP: [['Real Madrid', 94], ['FC Barcelone', 94], ['Atlético Madrid', 89], ['Athletic Bilbao', 84],
    ['Villarreal', 84], ['Real Sociedad', 82], ['Betis Séville', 82], ['Séville FC', 80],
    ['Valence CF', 79], ['Gérone', 79], ['Celta Vigo', 79], ['Osasuna', 77],
    ['Majorque', 77], ['Rayo Vallecano', 77], ['Getafe', 76], ['Espanyol', 75],
    ['Alavés', 75], ['Levante', 74], ['Elche', 74], ['Real Oviedo', 73]],
  ITA: [['Inter Milan', 91], ['Naples', 89], ['Juventus', 88], ['AC Milan', 88],
    ['Atalanta', 86], ['AS Rome', 86], ['Lazio', 83], ['Fiorentina', 82],
    ['Bologne', 82], ['Torino', 79], ['Côme', 78], ['Udinese', 77],
    ['Genoa', 77], ['Sassuolo', 76], ['Parme', 76], ['Cagliari', 75],
    ['Lecce', 74], ['Hellas Vérone', 74], ['Pise', 73], ['Cremonese', 73]],
  GER: [['Bayern Munich', 94], ['Bayer Leverkusen', 88], ['Borussia Dortmund', 88], ['RB Leipzig', 86],
    ['Eintracht Francfort', 84], ['VfB Stuttgart', 84], ['SC Fribourg', 81], ['Mayence', 80],
    ["Borussia M'gladbach", 79], ['Wolfsburg', 79], ['Werder Brême', 79], ['Hoffenheim', 78],
    ['Augsbourg', 77], ['Union Berlin', 77], ['FC Cologne', 76], ['Hambourg SV', 76],
    ['Sankt Pauli', 75], ['Heidenheim', 74]],
  NED: [['PSV Eindhoven', 84], ['Ajax', 83], ['Feyenoord', 83], ['AZ Alkmaar', 77], ['FC Twente', 76], ['FC Utrecht', 74],
    ['Go Ahead Eagles', 70], ['NEC Nimègue', 70], ['SC Heerenveen', 69], ['Sparta Rotterdam', 68], ['FC Groningen', 68], ['Fortuna Sittard', 67],
    ['Heracles Almelo', 66], ['PEC Zwolle', 66], ['NAC Breda', 65], ['Willem II', 65], ['Excelsior', 64], ['Telstar', 63]],
  POR: [['Benfica', 85], ['Sporting CP', 85], ['FC Porto', 85], ['SC Braga', 80], ['Vitória Guimarães', 75], ['Famalicão', 72],
    ['Moreirense', 70], ['Gil Vicente', 70], ['Rio Ave', 69], ['Estoril', 69], ['Casa Pia', 68], ['Arouca', 67],
    ['Santa Clara', 67], ['Nacional', 66], ['Estrela Amadora', 65], ['Tondela', 64], ['AVS', 63], ['Alverca', 63]],
  FRA: [['Paris Saint-Germain', 94], ['Olympique de Marseille', 85], ['AS Monaco', 85], ['Lille OSC', 83],
    ['Olympique Lyonnais', 83], ['OGC Nice', 81], ['RC Lens', 81], ['Stade Rennais', 80],
    ['RC Strasbourg', 80], ['Toulouse FC', 77], ['Stade Brestois', 77], ['FC Nantes', 76],
    ['Paris FC', 76], ['FC Lorient', 75], ['AJ Auxerre', 75], ['Angers SCO', 74],
    ['Le Havre AC', 74], ['FC Metz', 73]],
};

const CLUBS = {};
for (const lg in CLUB_LIST) {
  CLUB_LIST[lg].forEach(([name, rep]) => {
    const id = lg + ':' + name;
    CLUBS[id] = { id, name, rep, league: lg };
  });
}
const CLUB_IDS = Object.keys(CLUBS);
const CLUB_DEFAULT = {};
CLUB_IDS.forEach((id) => { CLUB_DEFAULT[id] = { rep: CLUBS[id].rep, league: CLUBS[id].league }; });

/* Caractère des joueurs */
const TRAITS = {
  pro: { name: 'Travailleur', icon: '💪', desc: 'Progresse plus vite.' },
  amb: { name: 'Ambitieux', icon: '🔥', desc: 'Progresse un peu plus vite, mais supporte mal le banc.' },
  loy: { name: 'Loyal', icon: '🤝', desc: 'Ne vous quittera pas pour un concurrent.' },
  lea: { name: 'Leader', icon: '🧢', desc: 'Meilleures notes en match.' },
  fet: { name: 'Fêtard', icon: '🍾', desc: 'Progresse moins vite et fait parler de lui.' },
  fra: { name: 'Fragile', icon: '🩹', desc: 'Se blesse deux fois plus souvent.' },
};
const TRAIT_KEYS = Object.keys(TRAITS);
const clubsOf = (lg) => CLUB_IDS.filter((id) => CLUBS[id].league === lg).map((id) => CLUBS[id]);

const NAMES = {
  BE: {
    first: ['Lucas', 'Noah', 'Arthur', 'Louis', 'Liam', 'Jules', 'Adam', 'Victor', 'Maxime', 'Nathan',
      'Thibault', 'Romain', 'Loïc', 'Simon', 'Hugo', 'Antoine', 'Mathis', 'Senne', 'Lars', 'Jelle',
      'Wout', 'Arne', 'Stijn', 'Bram', 'Kobe', 'Daan', 'Milan', 'Finn', 'Lowie', 'Robbe',
      'Yassine', 'Amine', 'Bilal', 'Ilias', 'Rayan', 'Mohamed', 'Christian', 'Jordan', 'Kévin', 'Dylan',
      'Elias', 'Mats', 'Tibo', 'Zeno', 'Ethan', 'Samuel', 'Aaron', 'Noé', 'Eliott', 'Cédric'],
    last: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet',
      'Dubois', 'Lambert', 'Dupont', 'Martin', 'Simon', 'Leroy', 'Renard', 'Lejeune', 'Collard', 'Henrard',
      'Vandenberghe', 'Van Damme', 'De Clercq', 'Verhaegen', 'Vermeulen', 'Desmet', 'Hermans', 'Pauwels', 'Michiels', 'Aerts',
      'El Amrani', 'Benali', 'Bakkali', 'Ouali', 'Mbemba', 'Kabongo', 'Lukebakio', 'Ngoy', 'Mputu', 'Diallo',
      'Lecomte', 'Delvaux', 'Gillet', 'Evrard', 'Pirard', 'Thys', 'Smets', 'Coppens', 'Segers', 'Baert'],
  },
  FR: {
    first: ['Enzo', 'Théo', 'Kylian', 'Mathéo', 'Ibrahim', 'Moussa', 'Léo', 'Tom', 'Sacha', 'Warren', 'Désiré', 'Malo', 'Rayan', 'Bradley', 'Yanis'],
    last: ['Moreau', 'Girard', 'Fofana', 'Camara', 'Traoré', 'Lefèbvre', 'Roux', 'Garnier', 'Koné', 'Benhamou', 'Chevalier', 'Mendy', 'Barbier', 'Diarra', 'Perrin'],
  },
  EN: {
    first: ['Jack', 'Harry', 'Oliver', 'Mason', 'Tyler', 'Callum', 'Jude', 'Reece', 'Kai', 'Alfie', 'Marcus', 'Ethan', 'Rico', 'Lewis', 'Archie'],
    last: ['Smith', 'Walker', 'Hughes', 'Bennett', 'Clarke', 'Morgan', 'Foster', 'Barnes', 'Okafor', 'Shaw', 'Palmer', 'Reid', 'Cooper', 'Adeyemi', 'Hall'],
  },
  ES: {
    first: ['Pablo', 'Álvaro', 'Hugo', 'Iker', 'Marc', 'Adrián', 'Dani', 'Sergio', 'Unai', 'Pau', 'Nico', 'Javi', 'Aitor', 'Rubén', 'Marcos'],
    last: ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Navarro', 'Torres', 'Ruiz', 'Iglesias', 'Vidal', 'Serrano', 'Ortega', 'Castro', 'Molina'],
  },
  IT: {
    first: ['Lorenzo', 'Matteo', 'Federico', 'Andrea', 'Davide', 'Nicolò', 'Samuele', 'Tommaso', 'Giacomo', 'Pietro', 'Simone', 'Filippo', 'Riccardo', 'Alessio', 'Manuel'],
    last: ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Conti', 'Gallo', 'Fontana', 'Moretti', 'Barbieri', 'Rinaldi'],
  },
  DE: {
    first: ['Leon', 'Jonas', 'Felix', 'Lukas', 'Maximilian', 'Paul', 'Niklas', 'Tim', 'Florian', 'Jamal', 'Kerem', 'Moritz', 'Jannik', 'Emre', 'Julian'],
    last: ['Müller', 'Schmidt', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Richter', 'Klein', 'Wolf', 'Yilmaz', 'Neumann', 'Braun', 'Krüger', 'Demir'],
  },
  NL: {
    first: ['Daan', 'Sem', 'Thijs', 'Jesse', 'Milan', 'Bram', 'Luuk', 'Ruben', 'Xavi', 'Justin', 'Noa', 'Jurriën', 'Quinten', 'Calvin', 'Ryan'],
    last: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'Bos', 'Vos', 'Dekker', 'Hendriks', 'van Dijk', 'Timber'],
  },
  PT: {
    first: ['João', 'Rúben', 'Diogo', 'Gonçalo', 'Tiago', 'Rafael', 'Bernardo', 'Francisco', 'Nuno', 'Vitinha', 'Pedro', 'André', 'Rodrigo', 'Afonso', 'Martim'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Costa', 'Oliveira', 'Rodrigues', 'Martins', 'Sousa', 'Gomes', 'Carvalho', 'Lopes', 'Ramos', 'Neves', 'Leão'],
  },
};

const COUNTRY_LABEL = { BE: '🇧🇪 Belgique', FR: '🇫🇷 France', EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre', ES: '🇪🇸 Espagne', IT: '🇮🇹 Italie', DE: '🇩🇪 Allemagne', NL: '🇳🇱 Pays-Bas', PT: '🇵🇹 Portugal' };
const COUNTRY_LEAGUES = { BE: ['BE1', 'BE2', 'BE3'], FR: ['FRA'], EN: ['ENG'], ES: ['ESP'], IT: ['ITA'], DE: ['GER'], NL: ['NED'], PT: ['POR'] };

const POSITIONS = { GB: 'Gardien', DEF: 'Défenseur', MIL: 'Milieu', ATT: 'Attaquant' };

const OFFICES = [
  { name: 'Garage familial', maxClients: 3, actions: 3, cost: 0, weekly: 100 },
  { name: 'Petit bureau à Liège', maxClients: 6, actions: 4, cost: 40000, weekly: 400 },
  { name: 'Bureaux à Bruxelles', maxClients: 10, actions: 5, cost: 250000, weekly: 2000 },
  { name: 'Agence internationale', maxClients: 16, actions: 6, cost: 1500000, weekly: 9000 },
  { name: 'Empire du football', maxClients: 25, actions: 7, cost: 8000000, weekly: 30000 },
];
const INTL_OFFICE = 3; // niveau de bureau requis pour recruter hors Belgique

const STAFF = {
  scout: { name: 'Scout', desc: 'Rapports complets dès la 1re observation et pépites recommandées (plus souvent à chaque niveau).', cost: 5000, weekly: 400 },
  nego: { name: 'Négociateur', desc: '+8 % par niveau sur les indemnités et primes, négociations plus sûres.', cost: 30000, weekly: 1500 },
  junior: { name: 'Agent associé', desc: 'Gère seul la routine sans utiliser vos actions : 1 tâche par semaine et par niveau (moral, prolongations hors mercato, sponsors, salaires).', cost: 20000, weekly: 1200 },
  coach: { name: 'Préparateur individuel', desc: '+12 % de progression par niveau et moins de blessures.', cost: 60000, weekly: 2500 },
};

const GOALS = [
  { id: 'sign1', label: 'Signer un premier joueur', reward: 1000 },
  { id: 'sign3', label: 'Avoir 3 joueurs sous mandat', reward: 2500 },
  { id: 'tr1', label: 'Réaliser un premier transfert', reward: 5000 },
  { id: 'be1', label: 'Placer un joueur en Jupiler Pro League', reward: 10000 },
  { id: 'big5', label: 'Placer un joueur dans un des 5 grands championnats', reward: 50000 },
  { id: 'earn1m', label: 'Encaisser 1 M€ de commissions au total', reward: 100000 },
  { id: 'ovr80', label: 'Avoir un client de niveau 80+', reward: 150000 },
  { id: 'top90', label: 'Placer un joueur dans un club de prestige 90+', reward: 500000 },
  { id: 'rep75', label: 'Atteindre 75 de réputation', reward: 1000000 },
  { id: 'top1', label: 'Devenir l\'agence n°1 du classement', reward: 5000000 },
];

const SEASON_WEEKS = 38;

/* Niveaux de difficulté */
const DIFFS = [
  { name: 'Facile', cash: 40000, bank: 50000, sign: 0.1, rivals: 0.25 },
  { name: 'Normal', cash: 20000, bank: 25000, sign: 0, rivals: 0.5 },
  { name: 'Difficile', cash: 10000, bank: 10000, sign: -0.08, rivals: 0.8 },
];

/* Marques fictives pour les contrats de sponsoring */
const BRANDS = ['Strada', 'Volt Sport', 'Kalyx', 'Nordwind', 'Brava', 'Pulse Energy', 'Mosa', 'Telcora', 'Atlas Wear', 'Zénith Montres', 'Ardenna', 'Fluxo'];

/* Coupes d'Europe : 16 clubs, élimination directe sur un match */
const EU = { C1: { name: 'Ligue des champions', short: 'LDC', icon: '🏆' }, C3: { name: 'Ligue Europa', short: 'C3', icon: '🥈' }, BC: { name: 'Coupe de Belgique', short: 'CB', icon: '🇧🇪' } };
const EU_WEEKS = [10, 16, 26, 34];
const EU_ROUNDS = ['8es de finale', 'Quarts de finale', 'Demi-finales', 'Finale'];
const inWindow = (w) => (w >= 1 && w <= 6) || (w >= 20 && w <= 23);

/* Plans d'entraînement individuels */
const PLANS = {
  std: { name: 'Standard', icon: '⚖️', desc: 'Équilibré.', g: 1, inj: 1, mor: 0, cost: 0 },
  int: { name: 'Intensif', icon: '🔥', desc: '+20 % de progression, mais plus de blessures et de fatigue. Coûte 20 % de son salaire chaque semaine.', g: 1.2, inj: 1.6, mor: -0.3 },
  rec: { name: 'Récupération', icon: '🧘', desc: 'Peu de blessures et meilleur moral, mais progression ralentie.', g: 0.75, inj: 0.4, mor: 0.3, cost: 0 },
};
const STAFF_COST_MULT = [1, 3, 8];
