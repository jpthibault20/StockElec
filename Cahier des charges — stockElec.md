# Cahier des charges — stockElec

Oct 1, 2026 · @thibault jeanpierre

## 0. Consignes pour l'agent IA

Ce document est la spécification complète du MVP de stockElec. Tu es l'agent de développement : tu conçois l'UI/UX et tu codes l'application de bout en bout.

Déjà en place, fourni par le client : le dépôt Git, le projet Supabase et le projet Vercel relié au dépôt. Tu travailles dans ce dépôt existant et tu ne recrées aucun de ces trois éléments. Les URL et clés Supabase sont fournies en variables d'environnement.

**Première action : créer `CLAUDE.md` à la racine du dépôt**, avant toute autre modification, avec au minimum ce contenu. Tu le respectes ensuite pendant tout le projet.

```markdown
# CLAUDE.md — stockElec

## Rules
- All code comments are written in English.
- Never run `git commit`.
- Never run `git push`.
- Never create branches or tags. Only modify files; the owner reviews and commits.
```

- Développe uniquement ce qui est décrit ici, aucune fonctionnalité en plus.
- Quand un point n'est pas précisé, choisis l'option la plus simple qui respecte la spec et note ce choix dans `DECISIONS.md`.
- Avant toute fonctionnalité, pose le socle : schéma de base de données (schéma et migrations Prisma) et design system (tokens de couleurs, typographie, espacements, composants de base).
- Suis l'ordre de la section 8. À la fin de chaque étape, l'app doit compiler, se lancer et être testable.
- TypeScript strict, aucune clé secrète côté client, `.env.example` tenu à jour.
- Si une étape exige une action manuelle (réglage dans le dashboard Supabase ou Vercel), arrête-toi et liste précisément ce qu'il faut faire ou fournir.

**Version 1 sans IA.** Cette première version sert à valider le concept : aucune fonctionnalité IA n'est active. Tout est préparé pour l'ajouter ensuite sans refonte : interface `IdentificationService` côté client, Edge Function `identify-component` en stub qui renvoie une réponse vide, champs prévus en base, et feature flag `NEXT_PUBLIC_AI_ENABLED=false` qui masque les entrées IA dans l'UI.

**Git : aucun commit, aucun push.** Tu modifies uniquement les fichiers du dépôt local. Pas de `git commit`, `git push`, création de branche ni de tag. Le client relit et commit lui-même.

## 1. Contexte et objectif

stockElec est une PWA de gestion de stock pour un maker (électronique + impression 3D). Objectif : savoir en moins de 5 secondes, depuis un téléphone, si une pièce est en stock, en quelle quantité et où elle est rangée, pour ne jamais racheter ce qu'on possède déjà.

Objectifs secondaires :

- prévenir les ruptures sur les consommables (étain, filament, flux, tresse…) ;
- recommander une pièce en un clic grâce à un lien fournisseur enregistré ;
- trouver une pièce équivalente quand la référence exacte n'est pas en stock.

Contrainte clé : la saisie doit être très rapide (cible : moins de 20 s pour ajouter ou mettre a jour un stock sur une pièce). Si la saisie est pénible, le stock ne sera pas tenu à jour et l'app perd tout son intérêt.

## 2. Périmètre

| Point | Décision |
| --- | --- |
| Utilisateurs | Un seul utilisateur, un seul stock (pas de partage, pas de rôles) |
| Plateforme | PWA installable (web), pas d'app native |
| Usage | 80 % mobile (atelier, magasin, en déplacement), 20 % desktop (saisie en masse, imports) |
| Domaines gérés | Électronique (composants, modules, outillage, consommables) et impression 3D (filament, pièces de rechange) |
| Langue | Interface en français |

Hors périmètre : multi-utilisateurs, gestion commerciale (factures, ventes), passage de commande automatique chez les fournisseurs.

## 3. Stack technique

Imposé :

- **Supabase** pour la base de données (PostgreSQL), l'authentification et le stockage des photos (Supabase Storage).
- **Prisma** pour le schéma de la base et les migrations (`prisma/schema.prisma`, `prisma migrate`). Les politiques RLS, grants et objets propres à Supabase sont ajoutés en SQL dans les migrations Prisma. L'application lit et écrit toujours via le client Supabase (supabase-js) protégé par la RLS.
- **Row Level Security** activée sur toutes les tables, même en mono-utilisateur.
- **PWA** : manifest, service worker, installable sur iOS et Android, accès caméra.
- React/Next.js
- Vercel

À choisir par l'agent, choix justifiés dans \`DECISIONS.md\` :

- librairie de scan code-barres / QR / DataMatrix dans le navigateur ;
- fournisseur IA vision pour l'identification photo (API LLM multimodale appelée depuis une Edge Function Supabase, clé jamais exposée côté client) : préparé mais non branché en V1 ;
- source de données composants pour les équivalences (API catalogue type Nexar/Octopart ou LCSC, et/ou LLM) ;

Pour chaque service externe, l'agent indique dans le README son coût mensuel estimé pour un usage personnel et la variable d'environnement de sa clé.

## 4. Fonctionnalités MVP

### 4.1 Authentification

- Connexion via Supabase Auth (email + mot de passe ou lien magique).
- Session persistante sur mobile : pas de reconnexion à chaque ouverture.

### 4.2 Gestion des articles

Un article = une référence en stock. Types d'articles :

- **Composant** : résistance, condensateur, CI, transistor, connecteur, module (ESP32, capteur…).
- **Consommable** : étain, flux, tresse à dessouder, gaine thermo, fil…
- **Outillage / accessoire** : pannes à souder, platines d'essai, pinces…
- **Impression 3D** : filament, buses, plateaux, pièces de rechange (voir 4.8).

Actions : créer, modifier, dupliquer, supprimer (avec confirmation), ajuster la quantité en +1 / −1 directement depuis la liste ou la fiche.

Champs d'un article :

- nom, catégorie et sous-catégorie, photo(s) ;
- référence fabricant (MPN), fabricant, boîtier (ex. 0805, SOT-23, DIP-8) ;
- paramètres techniques structurés selon la catégorie (ex. résistance : valeur, tolérance, puissance ; condensateur : capacité, tension, diélectrique) ;
- quantité, unité (pièce, mètre, gramme, bobine) et mode **quantité exacte** ou **approximative** (Beaucoup / Un peu / Presque vide) pour le vrac ;
- emplacement (voir 4.3) ;
- un ou plusieurs liens fournisseur avec prix unitaire indicatif ;
- lien datasheet, notes libres, tags.

### 4.3 Emplacements

- Arborescence libre sur plusieurs niveaux, ex. Atelier › Meuble A › Tiroir 3 › Boîte 2, ou Garage › Étagère › Carton 5.
- CRUD des emplacements, déplacement d'un article ou d'un emplacement entier.
- Chaque emplacement a un **QR code imprimable** (planche d'étiquettes PDF). Scanner un QR ouvre le contenu de l'emplacement et permet d'y ranger directement un article.
- Vue « contenu d'un emplacement » avec recherche.

### 4.4 Identification et ajout rapide

Trois modes d'ajout, accessibles depuis un bouton d'ajout toujours visible :

1. **Photo + IA** : l'utilisateur photographie la pièce ou son sachet. L'IA propose catégorie, nom, MPN, paramètres et boîtier. L'utilisateur valide ou corrige un formulaire pré-rempli. L'IA ne crée jamais l'article seule.
2. **Scan code-barres / QR / DataMatrix** : lecture des étiquettes fournisseurs (LCSC, Mouser, DigiKey, Farnell…) qui contiennent MPN et quantité, et des EAN des produits grand public. Pré-remplissage automatique.
3. **Saisie manuelle** avec autocomplétion sur les articles et catégories existants.

**En V1 (sans IA)** : le mode Photo enregistre la photo sur l'article et ouvre la saisie manuelle. L'appel IA est préparé mais désactivé par le feature flag.

**Anti-doublon** : avant d'enregistrer, l'app vérifie si un article similaire existe (même MPN ou paramètres proches) et propose d'ajouter la quantité à l'existant plutôt que créer un doublon.

### 4.5 Recherche avancée

- Barre de recherche globale, accessible partout, résultats instantanés pendant la frappe.
- Recherche plein texte tolérante aux fautes (nom, MPN, notes, tags).
- Recherche par paramètres en langage naturel ou par filtres, ex. « résistance 10k 0805 », « LDO 3.3V SOT-23 ».
- Filtres : catégorie, emplacement, stock faible, en rupture, type d'article.
- **Équivalences** : si la référence exacte n'est pas en stock, l'app propose les articles en stock compatibles (mêmes paramètres clés, boîtier compatible) avec les différences listées. En V1, la comparaison se fait par règles sur les paramètres structurés, sans IA.
- Recherche par photo : photographier une pièce pour savoir si on l'a déjà (préparée, activée avec l'IA après la V1).

### 4.6 Alertes de stock faible

- Seuil minimum paramétrable par article (quantité, longueur ou poids).
- Activable surtout pour les consommables, désactivé par défaut pour les composants.
- Badge et liste « À racheter » sur l'accueil. Notification push PWA optionnelle.

### 4.7 Liens de recommande et liste de courses

- Lien fournisseur cliquable depuis la fiche article.
- Liste de courses générée automatiquement à partir des articles sous le seuil, plus ajout manuel.
- Liste groupée par fournisseur, avec les liens, et cochable une fois achetée.

### 4.8 Module impression 3D

Même logique que l'électronique, avec des champs dédiés au filament :

- matière (PLA, PETG, ABS, TPU…), couleur avec pastille, marque, diamètre (1,75 / 2,85 mm) ;
- poids restant en grammes, calculable par pesée : poids mesuré − tare de la bobine (tare enregistrable par marque) ;
- températures recommandées buse / plateau ;
- date d'ouverture et date du dernier séchage ;
- seuil d'alerte en grammes.

Pièces de rechange 3D (buses, plateaux, courroies, ventilateurs…) gérées comme des articles classiques.

### 4.9 Accueil (dashboard)

- Recherche en haut de l'écran, bouton d'ajout rapide, bouton de scan.
- Alertes stock faible, derniers articles modifiés, accès rapide aux catégories.

### 4.10 Historique et export

- Journal des mouvements : ajout, retrait, déplacement, avec date.
- Export CSV complet du stock et import CSV pour la saisie en masse (usage desktop).

## 5. Modèle de données indicatif

Proposition de départ, à affiner par l'agent. Toutes les tables portent un `user_id` pour la RLS.

| Table | Rôle | Champs principaux |
| --- | --- | --- |
| `locations` | Emplacements en arborescence | id, parent\_id, nom, type (meuble, tiroir, boîte, carton…), qr\_code |
| `categories` | Catégories et sous-catégories | id, parent\_id, nom, schéma des paramètres (JSON) |
| `items` | Articles en stock | id, type, nom, category\_id, location\_id, mpn, fabricant, boîtier, params (JSONB), quantité, unité, mode\_quantité, seuil\_min, notes, tags |
| `item_photos` | Photos des articles | id, item\_id, chemin Supabase Storage |
| `item_links` | Liens fournisseurs | id, item\_id, fournisseur, url, prix\_unitaire |
| `filaments` | Détails filament (1-1 avec items) | item\_id, matière, couleur\_hex, diamètre, poids\_restant\_g, tare\_g, temp\_buse, temp\_plateau, date\_ouverture, date\_sechage |
| `stock_movements` | Historique | id, item\_id, delta, type (ajout, retrait, déplacement), date |
| `shopping_list` | Liste de courses | id, item\_id, quantité, acheté |

Le modèle est décrit dans `prisma/schema.prisma`. Les paramètres techniques sont stockés en JSONB et indexés pour permettre la recherche paramétrique.

## 6. UI / UX

L'agent joue le rôle de designer UI/UX. Avant de coder les écrans, il définit le design system et les parcours clés (trouver une pièce, ajouter une pièce, modifier une quantité, scanner un emplacement), puis construit des écrans soignés et cohérents, mobile first.

### Palette imposée

| Couleur | Hex | Usage suggéré |
| --- | --- | --- |
| Sable | `#AF9164` | Accent, boutons secondaires, sélection |
| Crème | `#F7F3E3` | Fond principal (thème clair) |
| Gris acier | `#B3B6B7` | Bordures, textes secondaires, états désactivés |
| Rouille | `#6F1A07` | Action principale, alertes stock faible |
| Brun nuit | `#2B2118` | Texte principal, fond du thème sombre |

L'agent peut proposer des déclinaisons (nuances, thème sombre) tant que les contrastes respectent WCAG AA.

### Principes d'ergonomie

- Mobile first, utilisable à une main : actions principales dans la zone du pouce (barre de navigation basse, bouton d'ajout flottant).
- 3 taps maximum pour : trouver une pièce, ajouter une pièce, modifier une quantité.
- Cibles tactiles d'au moins 44 px, lisible avec les mains sales ou à distance de l'établi.
- Desktop : vues tableau denses, raccourcis clavier, édition en masse.

### Animations

- Micro-interactions sobres et rapides (150 à 300 ms) : ajout au stock, changement de quantité, scan réussi, transitions entre écrans.
- Les animations ne doivent jamais ralentir une action. Respect du réglage système « réduire les animations ».

## 7. Exigences non fonctionnelles

| Exigence | Cible |
| --- | --- |
| Performance | Ouverture de l'app < 2 s sur mobile 4G, résultats de recherche < 300 ms |
| Hors ligne (MVP) | Consultation du stock et recherche possibles sans réseau (cache local) |
| Compatibilité | Safari iOS et Chrome Android récents, Chrome / Firefox / Edge desktop |
| Photos | Compression côté client avant envoi (cible < 500 Ko par photo) |
| Sécurité | RLS sur toutes les tables, clés API IA uniquement côté serveur (Edge Functions) |
| Sauvegarde | Export CSV complet disponible à tout moment |
| Coûts | Fonctionner dans les offres gratuites ou d'entrée de gamme (Supabase, hébergement) ; coût IA estimé par identification |
| Code | Dépôt Git, README d'installation, \`.env.example\` documenté |

## 8. Ordre de réalisation et validation

### Étapes

1. **Socle** : Next.js + TypeScript dans le dépôt existant, PWA (manifest, service worker, installable), branchement au projet Supabase existant, authentification, configuration compatible Vercel (le déploiement se fera au push du client).
2. **Design system et navigation** : tokens de la palette, composants de base, layout mobile (barre basse, bouton d'ajout flottant) et desktop.
3. **Données** : schéma Prisma et migrations des tables de la section 5, politiques RLS (SQL dans les migrations), buckets Storage.
4. **Emplacements** : arborescence CRUD, QR par emplacement, planche PDF d'étiquettes, scan d'un QR.
5. **Articles** : CRUD, paramètres par catégorie, quantité +1 / −1, photos, liens fournisseurs, anti-doublon.
6. **Ajout rapide** : scan code-barres / QR / DataMatrix, saisie manuelle avec autocomplétion, photo enregistrée sur l'article, Edge Function IA en stub désactivée.
7. **Recherche** : plein texte, paramétrique, filtres, équivalences par règles.
8. **Impression 3D** : champs filament, calcul du poids par pesée et tare.
9. **Alertes et courses** : seuils, liste « À racheter », liste de courses par fournisseur, accueil.
10. **Historique et données** : journal des mouvements, export / import CSV, consultation hors ligne.
11. **Recette** : vérifier chaque critère d'acceptation ci-dessous et corriger.

### Livrables

- Code source complet dans le dépôt local existant, sans commit ni push.
- Schéma et migrations Prisma (incluant les politiques RLS), Edge Functions, appliqués au projet Supabase existant.
- PWA prête à être déployée par le projet Vercel existant au push du client, et installable.
- README.md : installation locale, variables d'environnement, coût estimé des services externes.
- `DECISIONS.md` : choix pris par l'agent là où la spec était muette.

### Critères d'acceptation

- [ ] Ajouter ou mettre à jour le stock d'une pièce par saisie manuelle en moins de 20 s.
- [ ] Ajouter une pièce par scan d'une étiquette LCSC ou Mouser avec MPN et quantité pré-remplis.
- [ ] La photo prise à l'ajout est enregistrée sur l'article ; activer l'IA ne demande qu'une clé API et le passage du flag à true, sans refonte.
- [ ] L'ajout d'un doublon déclenche la proposition de fusion.
- [ ] Scanner un QR d'emplacement affiche son contenu.
- [ ] « résistance 10k 0805 » retrouve les articles correspondants.
- [ ] Un consommable sous son seuil apparaît dans « À racheter » et dans la liste de courses.
- [ ] Le stock est consultable sans réseau.
- [ ] L'app s'installe sur iOS et Android depuis le navigateur.
