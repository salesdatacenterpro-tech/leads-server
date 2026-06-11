# DevoirsGame — Prototype

Prototype web app : prends en photo un devoir scolaire → l'IA génère un mini-jeu pédagogique.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Claude Sonnet 4.6 Vision** pour l'analyse de la photo et la génération du jeu
- Prompt caching activé sur le system prompt pour réduire les coûts à l'échelle

## Mise en route

### 1. Ajouter ta clé Anthropic

Crée un fichier `.env.local` à la racine :

```bash
echo "ANTHROPIC_API_KEY=sk-ant-VOTRE_CLE_ICI" > .env.local
```

Tu peux récupérer une clé sur https://console.anthropic.com (rubrique API Keys).

### 2. Lancer le serveur de dev

```bash
npm run dev
```

Puis ouvre **http://localhost:3000** dans Chrome / Safari (le bouton "Prendre une photo" déclenche la caméra du mobile si tu ouvres l'URL depuis ton téléphone sur le même réseau).

### 3. Tester

- Prends en photo une feuille d'exercices (vocab anglais, table de multiplication, leçon, conjugaison…)
- Attends ~10s
- Joue !

## Coûts à l'usage

Par devoir traité (Sonnet 4.6) :
- ~1500 tokens d'image
- ~1500 tokens de sortie (JSON du jeu)
- Cache hit sur le system prompt après la 1ère requête → ~90% d'économie sur ces tokens
- **Estimation : ~0,03 € / devoir**

À 60 devoirs/mois par enfant → ~1,80 € de coût API, marge confortable sur 15 €/mois d'abonnement.

## Structure

```
app/
├── api/generate-game/route.ts   # Appel Claude Vision + parsing JSON
├── components/
│   ├── MemoryGame.tsx           # Jeu de paires (vocab, multiplications, dates)
│   └── QuizQuest.tsx            # Quiz narratif (leçons, conjugaison, grammaire)
├── play/page.tsx                # Écran de jeu + écran de victoire
└── page.tsx                     # Page d'upload (caméra/galerie)
```

## Types de jeux générés

Selon le contenu détecté, Claude choisit :

- **memoryMatch** — paires à associer (mots ↔ traductions, calculs ↔ résultats, dates ↔ évènements)
- **quizQuest** — mini-aventure narrative avec questions à choix multiples + explications

## Étapes suivantes possibles (hors prototype)

- Auth parent/enfant (Clerk, Auth.js)
- Persistance des devoirs (Postgres + Prisma ou Supabase)
- Dashboard parent (progression, points faibles)
- Plus de types de jeux : drag & drop pour la grammaire, course chrono pour les maths
- Stripe pour l'abonnement 15 €/mois
- PWA installable (manifest + service worker)
- Voix de synthèse pour la prononciation (vocab)
- App native React Native quand le concept est validé
