# Sourcing Terminal

Outil d'analyse d'offres fournisseurs high-tech / electromenager / telephonie pour arbitrage B2B et B2C sur les marches FR / EU / US.

## Fonctionnalites

- **Saisie d'offres** : reference, EAN, description, categorie, quantite, prix d'achat, marche cible
- **Analyse IA via Claude** : prix marche estimes (min / moyen / max), marges B2B et B2C, rotation, stock concurrents, score global, recommandation `ACHETER` / `NEGOCIER` / `PASSER`
- **Verification en ligne multi-sites** : ouverture en 1 clic de 52 sites repartis sur FR (Amazon, Cdiscount, Fnac, Darty, Boulanger, LDLC, ManoMano, Backmarket...), EU (Amazon DE/IT/ES/UK, MediaMarkt, Saturn, Currys...) et US (Amazon, BestBuy, Walmart, B&H, Newegg...). Recherche par EAN prioritaire, fallback sur la reference texte.
- **Filtrage intelligent par categorie** : pour du gaming, on propose LDLC, Micromania, GameStop ; pour du GEM, Boulanger, ManoMano, HomeDepot ; etc.
- **Changement de marche a la volee** : tabs FR / EU / US dans le panneau detail pour comparer les prix au-dela du marche cible de l'offre
- **Filtres & tri** : par marche, categorie, recommandation, mot-cle
- **Export CSV** des analyses
- **Persistance locale** : tes donnees restent dans ton navigateur (localStorage), rien n'est envoye sur un serveur externe

## Option 1 — Deployer sur Vercel (recommande, 5 minutes)

Vercel offre un hebergement gratuit avec URL permanente et HTTPS.

### Etape 1 — Preparer le code
1. Cree un compte gratuit sur [github.com](https://github.com) si besoin
2. Cree un nouveau repository prive (ex: `sourcing-terminal`)
3. Uploade tous les fichiers de ce projet dedans (drag-and-drop sur l'interface GitHub web fonctionne)

### Etape 2 — Deployer
1. Cree un compte sur [vercel.com](https://vercel.com) en te connectant avec GitHub
2. Clic `Add New...` → `Project`
3. Selectionne ton repository `sourcing-terminal`
4. Laisse tous les parametres par defaut (Vercel detecte Vite automatiquement)
5. Clic `Deploy`

Au bout de ~30 secondes, tu as une URL comme `sourcing-terminal-xxx.vercel.app`. Tout push sur GitHub redeploie automatiquement.

### Etape 3 — Premier usage
1. Ouvre ton URL Vercel
2. Clic sur le bouton `CLE API` en haut a droite
3. Colle ta cle API Anthropic (a obtenir sur [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys))
4. Enregistre. La cle reste stockee dans ton navigateur (localStorage), elle n'est jamais envoyee ailleurs qu'a l'API Anthropic officielle.

## Option 2 — Deployer sur Netlify

1. Compte gratuit sur [netlify.com](https://netlify.com)
2. `Add new site` → `Import an existing project` → connecte GitHub
3. Selectionne le repo. Netlify detecte Vite automatiquement.
4. `Deploy`

## Option 3 — Utilisation locale (sans deploiement)

Si tu veux juste faire tourner l'app sur ta machine sans la mettre en ligne :

```bash
# Installer Node.js 18+ si besoin : https://nodejs.org/

# Dans le dossier du projet
npm install
npm run dev
```

Ouvre l'URL affichee (generalement `http://localhost:5173`).

Pour construire la version production :
```bash
npm run build
npm run preview
```

## Cout estime de l'API Anthropic

Chaque analyse d'offre coute environ **0,01 a 0,03 EUR**. Pour 100 analyses par mois, compter 1-3 EUR.
Credit initial offert par Anthropic a l'inscription : 5 USD (largement suffisant pour tester).

## Securite de la cle API

- La cle est stockee en `localStorage` dans TON navigateur uniquement
- Elle est envoyee directement depuis ton navigateur vers `api.anthropic.com` (aucun serveur intermediaire)
- Pour partager l'app avec un collegue, il doit utiliser SA propre cle API
- Pour supprimer la cle : bouton `Supprimer la cle` dans le modal

> Note : l'header `anthropic-dangerous-direct-browser-access: true` est utilise pour autoriser l'appel depuis le navigateur. C'est officiel et supporte par Anthropic pour les outils personnels. Ne JAMAIS exposer cette cle sur un site public partage entre plusieurs utilisateurs.

## Personnalisation

- **Ajouter des sites** : modifier `SEARCH_URL` dans `src/App.jsx` (haut du fichier), avec les tags `market` et `tags`
- **Ajouter des categories** : modifier `CATEGORIES` et `CATEGORY_TAGS`
- **Changer le modele Claude** : dans `analyzeOffer()`, remplacer `claude-sonnet-4-5` par `claude-opus-4-5` (plus precis, plus cher) ou `claude-haiku-4-5-20251001` (plus rapide et moins cher, qualite moindre)

## Structure du projet

```
sourcing-terminal-app/
├── src/
│   ├── App.jsx          # Composant principal (UI + logique + styles)
│   ├── main.jsx         # Point d'entree React
│   └── storage-shim.js  # Shim localStorage compatible window.storage
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```

## Tech stack

- React 18 + Vite
- Lucide React (icones)
- API Anthropic Claude
- localStorage (persistance)
- Aucun serveur backend

## Licence

Usage personnel. Fourni tel quel, sans garantie.
