# Trajo · activer les groupes (Supabase)

À faire **une seule fois**, par l'administrateur (toi). Les personnes invitées n'ont
rien à configurer : le lien d'invitation contient tout.

## 1. Créer le projet (5 min)
1. Va sur **supabase.com** → *Start your project* → connecte-toi (GitHub ou e-mail).
2. *New project* :
   - **Name** : `trajo`
   - **Database password** : clique *Generate* (tu n'en auras pas besoin dans l'appli)
   - **Region** : *West EU (Paris)* ou *Central EU (Frankfurt)*
   - Plan **Free** → *Create new project* (1–2 min d'attente).

## 2. Créer la base
1. Menu de gauche → **SQL Editor** → *New query*.
2. Colle **tout** le contenu de `schema.sql` → **Run**.
3. Résultat attendu : *Success. No rows returned*.

## 3. Autoriser la connexion par pseudo
**Authentication** → **Sign In / Providers** → active **Allow anonymous sign-ins** → *Save*.

## 4. Connecter Trajo
1. **Project Settings** (roue dentée) → **API** (ou *Data API*).
2. Copie **Project URL** (`https://xxxx.supabase.co`) et la clé **anon public** (`eyJ…`).
3. Dans Trajo : **Groupes → Créer mon espace (administrateur)** → colle l'URL et la clé → *Connecter*.
4. Choisis ton pseudo, crée un groupe, et envoie l'invitation.

## Sécurité
- La clé *anon public* est faite pour être dans une appli : les règles de la base
  (RLS, testées) empêchent quiconque hors d'un groupe de lire quoi que ce soit.
- Ne partage **jamais** la clé *service_role* ni le mot de passe de la base.
- Chaque membre choisit s'il partage sa position, groupe par groupe, et peut quitter un groupe à tout moment.
- Positions partagées : seulement pendant les trajets + dernier stationnement.

## Limites du plan gratuit
Largement suffisant pour une famille ou des amis (500 Mo de base, 50 000 utilisateurs).
Un projet gratuit inactif 7 jours est mis en pause : il suffit de le relancer depuis le tableau de bord Supabase.
