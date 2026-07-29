# Calendrier Éditorial KMI

Outil interne (pas de vente) de génération et de planification de contenu social
media multi-marques. À partir d'un thème, Claude rédige un post adapté à chaque
réseau (LinkedIn, Instagram, Facebook, TikTok), classé dans un calendrier, prêt
à copier-coller.

Marques prévues : Studio By KM, Bornia, KMI Group, Vumos.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + Tailwind CSS 4
- **Supabase** — Postgres + Auth (un seul compte admin), RLS activée
- **API Anthropic** — appelée uniquement côté serveur : Sonnet 5 pour les posts,
  Opus 5 pour l'analyse de marque (voir « Coût de l'API » plus bas)

La clé Anthropic n'est jamais exposée au client : toute génération passe par des
Server Actions (`src/app/actions/`).

## Mise en route

### 1. Base de données

Créer un projet Supabase (ou un schéma dédié dans un projet existant), puis
appliquer les migrations dans l'ordre :

| Fichier | Contenu |
| --- | --- |
| `supabase/migrations/0001_init.sql` | tables `brands`, `brand_platforms`, `topics`, `posts`, index, triggers, RLS |
| `supabase/migrations/0002_seed_brands.sql` | *optionnel* — les 4 marques KMI et leurs réseaux |

Via l'éditeur SQL du dashboard, ou avec la CLI :

```bash
supabase link --project-ref <ref>
supabase db push
```

### 2. Compte admin

Dashboard Supabase → **Authentication → Users → Add user** : créer le compte
(email + mot de passe) et cocher « Auto Confirm User ». C'est le seul compte
nécessaire ; l'inscription publique n'existe pas dans l'app.

Recommandé : **Authentication → Providers → Email** → désactiver
« Enable signups ».

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (clé publique / anon) |
| `ANTHROPIC_API_KEY` | console.anthropic.com — **serveur uniquement** |
| `ANTHROPIC_MODEL_POSTS` | *optionnel*, défaut `claude-sonnet-5` |
| `ANTHROPIC_MODEL_ANALYSIS` | *optionnel*, défaut `claude-opus-5` |

### 4. Lancer

```bash
npm install
npm run dev      # http://localhost:3000
```

## Utilisation

### Onboarding marque (une fois par marque)

`/marques/<id>` enchaîne les trois étapes de la spec :

1. **Analyse du site** — les pages clés (`/`, `/a-propos`, `/about`, `/offres`,
   `/services`, `/tarifs`, `/contact`) sont récupérées, converties en texte, et
   envoyées à Claude pour en extraire positionnement, offres, ton, points forts,
   cibles et éléments de langage.
2. **Questions complémentaires** — 5 questions (activité, cibles, ton, interdits,
   posts qui ont marché) qui enrichissent l'analyse. Suffisantes à elles seules
   si la marque n'a pas de site.
3. **Validation** — la fiche proposée s'affiche dans des champs éditables et
   n'est enregistrée qu'après validation explicite. Ré-analysable à tout moment
   (ex. après un changement d'offre).

Le résultat alimente `brands.brand_profile` et `brands.editorial_guidelines`,
socle de contexte permanent réutilisé pour tous les sujets de la marque.

### Onboarding sujet + génération

`/sujets/nouveau` : marque, sujet en une phrase, angle, détails précis
(chiffres, offre, date, lieu), objectif, date prévue, puis **cases à cocher des
réseaux**. Un post est généré uniquement pour chaque réseau coché — un sujet
peut ne sortir que sur LinkedIn, un autre sur les quatre.

Chaque post contient le texte, des hashtags adaptés à la plateforme, et une
description du visuel à créer. Les quatre plateformes ont des consignes de
format distinctes (`src/lib/platforms.ts`) : longueur, ton, emojis, nombre de
hashtags, et pour TikTok un script vidéo découpé en séquences suivi de la
légende.

Garde-fous du prompt (`src/lib/generate.ts`) : aucun chiffre, prix, date,
témoignage ou référence client inventé — si l'info n'est pas dans le brief ou la
fiche, elle n'est pas écrite. Vocabulaire creux explicitement banni.

### Calendrier

`/calendrier` — vue mois ou semaine, filtres par marque et par statut, une case
par post avec badge plateforme + statut, et une liste des posts non planifiés.

### Fiche post

`/posts/<id>` — contenu éditable en ligne, hashtags et suggestion média affichés
séparément, bouton **Copier** (texte + hashtags uniquement : la suggestion média
est une note interne), date de publication, statut brouillon / validé / publié,
et **régénération individuelle** avec consigne facultative (« plus court »,
« commence par une question »…).

## Structure

```
src/
  app/
    actions/            Server Actions (auth, brands, topics, posts)
    (app)/              app authentifiée : calendrier, marques, sujets, posts
    login/              écran de connexion
  components/           badges, nav, boutons, chip de calendrier
  lib/
    anthropic.ts        client Claude + appel JSON contraint (structured outputs)
    brand-analysis.ts   onboarding marque → fiche de connaissance
    generate.ts         prompts système/utilisateur + génération multi-plateforme
    scrape.ts           récupération et nettoyage des pages du site
    platforms.ts        consignes de format par réseau, statuts, objectifs
    date.ts             grilles mois/semaine
    supabase/           clients navigateur et serveur
  proxy.ts              rafraîchissement de session + garde d'authentification
supabase/migrations/    schéma SQL
```

## Coût de l'API

Deux modèles, choisis par usage (`src/lib/anthropic.ts`) :

| Usage | Modèle par défaut | Pourquoi |
| --- | --- | --- |
| Génération des posts | `claude-sonnet-5` | C'est le volume. Excellent copywriting court dès que le brief et la fiche de marque sont précis, à ~40 % du prix d'Opus. |
| Analyse de marque | `claude-opus-5` | Une fois par marque. C'est le texte dont dépend la qualité de tous les posts suivants : on ne rogne pas dessus. |

Ordre de grandeur par appel (entrée = fiche de marque + brief ≈ 3 k tokens,
sortie ≈ 2 k tokens en comptant le raisonnement) :

| | Un post | Un sujet sur 4 réseaux | 20 sujets / mois |
| --- | --- | --- | --- |
| Sonnet 5 | ~0,02 € | ~0,10 € | **~2 €** |
| Opus 5 | ~0,06 € | ~0,25 € | ~5 € |

L'analyse d'une marque coûte ~0,10 € et n'est relancée qu'en cas de changement
d'offre. Autrement dit : l'enjeu financier est faible dans les deux cas, Sonnet
divise simplement la facture par deux sans perte visible sur ce type de contenu.

Pour tout passer en Opus : `ANTHROPIC_MODEL_POSTS=claude-opus-5`.
Haiku n'est pas recommandé ici — l'économie se compte en centimes et la qualité
rédactionnelle baisse nettement.

## Notes techniques

- **Next 16** : `middleware` est renommé `proxy` (`src/proxy.ts`), et `params`,
  `searchParams`, `cookies()` sont asynchrones.
- **Durées** : une génération multi-réseaux prend 30 à 90 s (un appel Claude par
  plateforme, exécutés en parallèle). Sur un hébergeur avec timeout court
  (Vercel Hobby : 10 s), augmenter la limite de la fonction ou passer la
  génération en tâche de fond.
- **Échecs partiels** : si un réseau échoue, les autres posts sont quand même
  enregistrés.
- **RLS** : le rôle `authenticated` a tous les droits, `anon` aucun. L'app étant
  mono-utilisateur, il n'y a pas de colonne `user_id`.

## Hors périmètre (V2)

Génération de visuels, publication automatique via les API Meta/LinkedIn,
analytics de performance, ré-analyse automatique du site à intervalle régulier.
