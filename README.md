# Mini City Tycoon — README

## 1️⃣ Principe & vision du jeu

**Mini City Tycoon** est un jeu de **gestion / city builder en vue top-down**, centré sur une **ville de loisirs premium à destination d’adultes**, traité de manière **abstraite, systémique, économique et comportementale**.

Le cœur du jeu repose sur :

- l’attractivité de la ville,
- la rétention des visiteurs,
- la gestion fine des flux humains,
- l’optimisation économique à long terme,
- la gestion du personnel et de leurs compétences,
- une **forte composante visuelle personnalisable** (sprites, icônes, effets), indépendante du moteur,
- une **pression économique long terme** (temps qui passe, échéances, dette à rembourser),
- une **carte procédurale** (taille initiale limitée) avec **districts de spécialisation** visibles.

Aucun contenu explicite n’est représenté :  
le plaisir de jeu provient **exclusivement des systèmes**, des décisions stratégiques et des interactions entre mécaniques.

### Objectif du joueur

- Démarrer sur une carte générée (taille initiale définie) avec plusieurs **districts** aléatoires
- Construire uniquement dans la **zone débloquée / générée**
- Attirer des visiteurs via les routes
- Les faire rester le plus longtemps possible
- Maximiser les revenus tout en contrôlant les coûts
- Maintenir un équilibre entre :
  - satisfaction,
  - réputation,
  - sécurité,
  - pression réglementaire abstraite,
  - durabilité économique
- Survivre et croître sous des **échéances** (dette mensuelle croissante), sans “game over” brutal

Il n’existe pas de _game over_ brutal :  
le jeu privilégie les **échecs progressifs récupérables** (ville vidée, mauvaise réputation, saturation, dette difficile, etc.).

---

## 2️⃣ Boucle de gameplay principale (Core Loop)

1. Générer une carte initiale (taille limitée) avec **districts de spécialisation** (taille et placement aléatoires, bien visibles)
2. Construire routes et bâtiments **uniquement** dans la zone autorisée
3. Les visiteurs apparaissent via les routes
4. Les personnages (visiteurs & personnel) se déplacent **physiquement sur la carte**, de manière **strictement orthogonale** (jamais en diagonale)
5. Ils consomment des services ou travaillent dans les bâtiments
6. Le jeu combine **revenus** et **coûts** à plusieurs échelles :
   - ponctuels (ex : une personne consomme)
   - journaliers (ex : revenu de base, certains coûts)
   - mensuels (ex : entretien bâtiments, salaires, dette)
7. Satisfaction, réputation et sécurité influencent :
   - la durée de séjour,
   - les retours,
   - le type de visiteurs qui arrivent,
   - certains déblocages / restrictions
8. Les revenus permettent :
   - d’améliorer les bâtiments,
   - de spécialiser des quartiers,
   - d’étendre la ville (achat de tiles/zone),
   - de recruter et former du personnel
9. Le temps avance (jour/mois/heure locale), et chaque mois il faut **rembourser une dette** qui **grossit**.

👉 Le joueur optimise **des flux visibles et la rétention**, sous **contraintes de temps** et d’objectifs financiers multi-échelles.

---

## 3️⃣ Carte & districts (nouveau pilier)

### Carte procédurale

- Au lancement, générer une **carte initiale** de taille définie (ex : NxN) :
  - extensible plus tard via **achat/déblocage** de nouvelles zones
- On **ne peut construire** que dans la zone initialement générée / débloquée.

### Districts de spécialisation

- Générer des **districts** :
  - nombre aléatoire (dans une fourchette),
  - taille aléatoire,
  - position aléatoire,
  - **bien visibles** (couleur/overlay/contour clair).
- Les districts influencent :
  - bonus/malus économiques,
  - déblocages de bâtiments,
  - synergies,
  - réputation/sécurité,
  - événements.
- Les districts sont **data-driven** (règles, tags, effets).

---

## 4️⃣ Types de bâtiments (abstraits)

> Tous les bâtiments sont destinés à devenir **data-driven** (config JSON) et peuvent avoir des **tailles différentes**.

### Économie des bâtiments (règle globale)

Les bâtiments ont des coûts et gains potentiellement à plusieurs temporalités :

- **Coût de construction** (ponctuel)
- **Coût d’entretien** (mensuel)
- **Coûts de personnel** (mensuels)
- **Revenus journaliers** (ex : revenu passif par jour)
- **Revenus ponctuels** (ex : consommation par visiteur)
- Éventuellement **coûts ponctuels** (événement, réparation, etc.)

---

### A. Hébergements

**Rôle** : augmenter la durée de séjour et la valeur de chaque visiteur.

Exemples :

- Hôtel standard
- Hôtel premium
- Résidences privées
- Suites exclusives (faible capacité, très rentables)

Paramètres :

- Capacité
- Confort
- Prix par tick (jour / séjour)
- Exigences de services annexes

---

### B. Services premium (abstraits)

**Rôle** : générer satisfaction élevée + dépenses importantes (ponctuelles).

Paramètres :

- Accès conditionnel (invitation, réputation, budget)
- Temps d’attente
- Prix par visite / session
- Impact sur réputation

---

### C. Restaurants & bars

**Rôle** : besoins récurrents, synergies avec hôtels & divertissements.

Paramètres :

- Qualité
- Temps de service
- Capacité
- Prix par consommation

---

### D. Casinos & divertissement

**Rôle** : pics de revenus + attachement abstrait.

Mécaniques :

- Variance des gains
- Saturation
- Impact sur rétention

---

### E. Bâtiments réservés au personnel

- Logements (repos, moral, fidélité)
- Soutien (infirmerie, cantine, repos)
- Formation (XP accélérée, re-spécialisation coûteuse)

---

### F. Sécurité (à intégrer)

- Score global de **sécurité / délinquance**
- Possibilité de recruter des **gardes** (personnel) qui patrouillent

---

## 5️⃣ Visiteurs (système central)

Chaque visiteur est une **entité autonome** avec :

- Budget, patience, préférences (luxe/discrétion/variété), fatigue
- Sensibilité au prix, à la réputation, à la sécurité
- États : arriving → wandering → consuming/resting/waiting → leaving

Les visiteurs :

- circulent via les routes,
- consomment des services,
- génèrent du revenu ponctuel + influencent la satisfaction.

---

## 6️⃣ Personnel & progression RPG

### Boucle secondaire

- Recruter → Assigner → Optimiser → XP → Débloquer passifs/skills

### Travailleurs

- Niveau/XP, ressources (endurance/santé/moral), stats (efficacité/polyvalence/stress/loyauté), traits
- Métiers : 1 principal + 0–2 secondaires
- Besoins : déplacements logement/travail/soutien

### Skills & procs

- Passifs permanents + procs conditionnels (trigger/conditions/chance/cooldown/cost)
- Pré-requis argent + réputation (réputation négative incluse)
- Affichage visuel (icônes / VFX)

### Progression des visiteurs

- Pas d’arbre de skill
- Barre d’XP qui fait évoluer leurs caractéristiques

---

## 7️⃣ Routes & flux

- Routes = entrée + circulation visiteurs/personnel
- Pathfinding strictement orthogonal
- UX : construction routes “peinture” (drag)
- Districts + topologie route influencent le flux et la frustration

---

## 8️⃣ Temps, économie multi-échelles & dette

- Temps logique : heure locale / jour / mois
- Déclencheurs :
  - journaliers (revenus/certains coûts)
  - mensuels (entretien, salaires, dette)
  - ponctuels (consommation, événements)
- Dette :
  - remboursement mensuel obligatoire
  - dette qui grossit selon une formule data-driven
  - conséquences en cas de non-paiement : pénalités progressives (pas de game over brutal)

---

## 9️⃣ Réputation & sécurité

### Réputation

- Score global unique (peut être négatif)
- Prérequis de contenu (bâtiments/skills/branches) : argent + réputation min/max

### Sécurité

- Score global de délinquance/sécurité
- Gardes patrouillent et influencent événements, satisfaction, rétention

---

## 1️⃣0️⃣ Passifs & synergies

- Passifs buildings + staff + city modifiers
- Synergies :
  - proximité,
  - chaînes économiques,
  - districts spécialisés,
  - staffing intelligent

---

## 1️⃣1️⃣ Dimension visuelle & sprites

- Tous les acteurs + systèmes (bâtiments/visiteurs/staff/skills/upgrades/effects) sont affichables via assets **surchargeables**
- Asset resolver via `AssetDefinition` + `SpriteRule` + fallback
- Optimisation images : cache/atlas/pooling
- UI popups : slot image (gris/flou si locked) + draggable
- Effets contextuels : ex afficher l’image d’une travailleuse au-dessus d’un bâtiment pendant un service

---

## 1️⃣2️⃣ Exception V0 — Dette & Game Over brutal

Pour la **V0 (vertical slice jouable)**, une règle exceptionnelle s’applique :

- Une **dette mensuelle** est prélevée automatiquement en **fin de mois**.
- Le joueur peut **rembourser manuellement** la dette avant l’échéance.
- **Si, lors du prélèvement de fin de mois, les fonds sont insuffisants : Game Over brutal immédiat.**

Cette règle est une **exception volontaire limitée à la V0** (afin de simplifier la simulation et d’obtenir une condition de fin nette et testable).  
Elle pourra être remplacée par des échecs progressifs récupérables dans des versions ultérieures.

---

## 1️⃣3️⃣ Process V0

La V0 est pilotée par :

- `GAME_V0_CONTRACT.md` : périmètre exécutable (ce qui est autorisé/interdit en V0)
- `SCOPE_AUDIT.md` : inventaire des systèmes existants (CORE/SUPPORT/HORS-SCOPE) + stratégie de désactivation réversible

---

## 🔧 Spécifications techniques & rigueur

- Next.js + Pixi.js + TypeScript strict
- Architecture data-driven (JSON pour definitions/rules/economy/skills/assets)
- Invariants :
  - pas de diagonale
  - pause parfaite
  - routes non interactives
  - curseur crosshair
  - bâtiments tailles variables
  - construction limitée à zone débloquée/générée
  - économie multi-échelles (ponctuel/journalier/mensuel)

---

## 1️⃣4️⃣ TODO — Avancement du projet

### ✅ Fondations déjà en place

- [x] Grille orthogonale et placement centré sur les cases
- [x] Routes & pathfinding sans diagonales
- [x] Personnes autonomes se déplaçant sur les routes
- [x] Entrée visuelle des personnes dans les bâtiments
- [x] Bâtiments produisant automatiquement de l’argent
- [x] Production passive basée sur type/niveau/occupants
- [x] Pause / reprise propre (bâtiments + personnages)
- [x] UI globale (barre supérieure)
- [x] Popovers de bâtiments au-dessus du bâtiment sélectionné
- [x] Tooltips économiques simples et lisibles
- [x] Curseur en croix sur le canvas

### ⏳ À faire / améliorer

- [x] Génération de carte initiale (taille définie) + extension via achat
- [x] Districts aléatoires visibles (taille/position aléatoires) + règles data-driven
- [x] Construction limitée à la zone débloquée
- [x] Économie multi-échelles (ponctuel/journalier/mensuel) appliquée à tous bâtiments
- [x] Coûts mensuels (entretien bâtiments, salaires, etc.)
- [x] Revenus ponctuels (consommation) + revenus journaliers
- [x] Intégration districts → bonus/malus + déblocages
- [x] Ajuster tooltips pour expliquer les calculs par temporalité (jour/mois/ponctuel)

### 🚀 Vision long terme

- [x] Sauvegarde / reprise complète (ville, personnel, skills, assets actifs)
- [x] Packs graphiques / mods complets (thèmes visuels alternatifs)

---

## 🎯 Intention finale

> Une simulation de gestion adulte, élégante, systémique et modulaire,  
> où chaque entité est calculable et observable,  
> et où le moteur vit indépendamment de son habillage graphique.
