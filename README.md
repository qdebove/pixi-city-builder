# Mini City Tycoon — README

## 1️⃣ Principe & vision du jeu

**Mini City Tycoon** est un jeu de **gestion / city builder en vue top-down**, centré sur une **ville de loisirs premium à destination d’adultes**, traité de manière **abstraite, systémique, économique et comportementale**.

Le cœur du jeu repose sur :

- l’attractivité de la ville,
- la rétention des visiteurs,
- la gestion fine des flux humains,
- l’optimisation économique à long terme,
- la gestion du personnel et de leurs compétences,
- une **forte composante visuelle personnalisable** (sprites, icônes, effets), indépendante du moteur.

Aucun contenu explicite n’est représenté :  
le plaisir de jeu provient **exclusivement des systèmes**, des décisions stratégiques et des interactions entre mécaniques.

### Objectif du joueur

- Attirer des visiteurs via les routes
- Les faire rester le plus longtemps possible
- Maximiser les revenus
- Maintenir un équilibre entre :
  - satisfaction,
  - réputation,
  - pression réglementaire abstraite,
  - durabilité économique

Il n’existe pas de *game over* brutal :  
le jeu privilégie les **échecs progressifs récupérables** (ville vidée, mauvaise réputation, saturation, etc.).

---

## 2️⃣ Boucle de gameplay principale (Core Loop)

1. Construire routes et bâtiments
2. Les visiteurs apparaissent via les routes
3. Les personnages (visiteurs & personnel) se déplacent **physiquement sur la carte**, de manière **strictement orthogonale** (jamais en diagonale)
4. Ils consomment des services ou travaillent dans les bâtiments
5. Les bâtiments génèrent des **revenus passifs** (aucune mécanique de “clicker” manuel)
6. Satisfaction & réputation influencent :
   - la durée de séjour,
   - les retours,
   - le type de visiteurs qui arrivent
7. Les revenus permettent :
   - d’améliorer les bâtiments,
   - de spécialiser des quartiers,
   - d’étendre la ville,
   - de recruter et former du personnel

👉 Le joueur optimise **des flux visibles et la rétention**, pas seulement des chiffres.

---

## 3️⃣ Types de bâtiments (abstraits)

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
- Prix par tick / par séjour
- Exigences de services annexes (restaurants, divertissement...)

---

### B. Services premium (abstraits)
**Rôle** : générer de la satisfaction élevée + des dépenses importantes.

Exemples :

- Salons privés
- Clubs
- Espaces VIP
- Services personnalisés

Paramètres :

- Accès conditionnel (invitation, réputation, budget)
- Temps d’attente
- Coût
- Impact sur la réputation (locale / premium)

---

### C. Restaurants & bars
**Rôle** : répondre aux besoins récurrents des visiteurs & du personnel.

Paramètres :

- Qualité
- Temps de service
- Capacité
- Synergies avec hôtels, casinos, zones de nuit

---

### D. Casinos & divertissement
**Rôle** : générer des pics de revenus + un “attachement” abstrait.

Mécaniques :

- Variance des gains
- Effets sur la satisfaction et la rétention
- Risque de saturation / surfréquentation

---

### E. Bâtiments réservés au personnel

- **Logements du personnel** : dortoirs, appartements, résidences premium  
  → impact sur repos, moral, fidélité
- **Infrastructures de soutien** : infirmerie, cantine, salle de repos  
  → gestion de la fatigue, santé, moral
- **Centres de formation** :  
  → XP accélérée, déblocage de spécialisations, re-spécialisation coûteuse

---

## 4️⃣ Les visiteurs (système central)

Chaque visiteur est une **entité autonome** avec :

### Attributs possibles

- Budget
- Tolérance à l’attente
- Préférences :
  - luxe
  - discrétion
  - variété
- Fatigue
- Sensibilité au prix
- Sensibilité à la réputation
- Durée maximale de séjour

### États

- Arrivée
- Exploration (wandering)
- Consommation (consuming)
- Repos (resting)
- Attente (waiting)
- Départ (leaving)

Les visiteurs :

- circulent via les routes,
- prennent des décisions en fonction de leurs stats, de la ville et du personnel,
- peuvent devenir réguliers / premium via la satisfaction et les compétences du staff.

👉 Le joueur gère une **population dynamique**, pas des pions passifs.

---

## 5️⃣ Personnel & progression RPG

### Nouvelle boucle secondaire

- Recruter du personnel
- Assigner le personnel à des bâtiments
- Améliorer les performances des bâtiments
- Accumuler expérience & niveaux
- Débloquer compétences, passifs et spécialisations

👉 Le city builder devient aussi un **jeu de gestion humaine et de progression RPG légère**.

---

### Travailleurs (structure abstraite)

Chaque travailleur possède :

- Niveau & expérience (XP)
- Ressources :
  - endurance
  - santé
  - moral
- Stats :
  - efficacité
  - polyvalence
  - résistance au stress
  - loyauté
- Traits individuels (bonus/malus)
- Métiers :
  - 1 métier principal
  - 0–2 métiers secondaires (moins efficaces)
- Besoins :
  - fatigue / stress / faim / repos
  - circulation entre logement / travail / soutien

---

### Métiers (exemples abstraits)

- Accueil / service client
- Animation
- Gestion VIP
- Cuisine / bar
- Logistique / entretien
- Sécurité
- Administration

Efficacité :

- 100 % dans le métier principal
- 50–70 % dans les métiers secondaires
- Malus si affecté à un poste hors compétence

---

### Arbres de compétences & procs

Chaque métier dispose d’un **arbre de compétences** :

- Nœuds **permanents** (passifs) : bonus constants
- Nœuds **conditionnels** (procs) : effets déclenchés par événements
- Choix de branches et spécialisations, parfois irréversibles

Les compétences peuvent :

- avoir des **conditions** d’activation (statistiques, état, contexte),
- une **chance** de déclenchement,
- un **cooldown**,
- un **coût** (endurance, moral, argent, etc.),
- des **effets visuels** associés (icône, VFX discret).

---

## 6️⃣ Routes & flux

- Les routes sont les **points d’entrée et de circulation** des visiteurs et du personnel.
- Le pathfinding est **strictement orthogonal** (aucune diagonale).
- La qualité de la topologie des routes influence :
  - le volume de visiteurs,
  - le type de visiteurs,
  - la frustration (goulots d’étranglement, détours).

Types abstraits de routes :

- **Routes publiques** : volume élevé, visiteurs plus “standard”
- **Accès privés** : volume plus faible, visiteurs premium

Les goulots d’étranglement génèrent :

- files d’attente,
- perte de satisfaction,
- départs prématurés,
- pression sur la réputation.

---

## 7️⃣ Temps, rétention & réputation

Les visiteurs décident de rester selon :

- satisfaction cumulée,
- argent restant,
- diversité des services utilisés,
- temps d’attente,
- qualité des déplacements,
- interactions avec le personnel.

### Réputation

- **Réputation locale** : popularité générale
- **Réputation premium** : attractivité haut de gamme
- **Pression réglementaire abstraite** : contraintes et risques

Conséquences :

- déblocage / blocage de certains bâtiments,
- modification du mix de visiteurs,
- événements (contrôles, afflux, restrictions...).

---

## 8️⃣ Passifs & synergies

### Passifs de bâtiments

Chaque bâtiment peut débloquer des **passifs** qui influencent :

- l’efficacité du personnel assigné,
- la consommation d’endurance,
- l’arrivée de visiteurs premium,
- les revenus passifs,
- la réputation.

Déblocage selon :

- niveau du bâtiment,
- personnel expérimenté,
- investissements / recherche,
- objectifs atteints.

---

### Synergies

- Proximité logement / lieu de travail
- Groupes de collègues stables
- Spécialisation de quartier (zone hôtelière, zone de nuit, zone staff, etc.)
- Chaînes économiques (ex : hôtel → restaurant → casino → services premium)

👉 Le joueur cherche des **patterns de synergies** plutôt que des bonus isolés.

---

## 9️⃣ Dimension visuelle & sprites

### Principe général

Tous les **acteurs du jeu** peuvent être représentés visuellement via des **sprites personnalisables** :

- visiteurs,
- personnel,
- bâtiments,
- améliorations,
- compétences actives/passives,
- effets visuels contextuels (revenus, proc de skill, alertes).

Une représentation minimale (rectangle + icône) doit rester possible, mais le système est conçu pour être **entièrement extensible graphiquement**.

---

### Personnages (visiteurs & personnel)

Chaque entité humaine dispose :

- d’un **sprite de base** visible sur la carte,
- de transitions simples possibles :
  - déplacement,
  - entrée / sortie de bâtiment,
  - repos / attente,
- d’une cohérence visuelle avec son état (travail, pause, déplacement).

Les sprites :

- peuvent être simples (rectangle + pictogramme),
- ou remplacés par des assets plus détaillés,
- sont **surchageables sans modifier le code**.

---

### Système d’assets data-driven

Le jeu doit permettre :

- de **surcharger facilement les assets graphiques** (sprites, portraits, icônes, effets),
- sans toucher au moteur,
- via une **hiérarchie de dossiers claire** et des règles de sélection.

Exemple de structure indicative :

```text
assets/
├─ characters/
│   ├─ visitors/
│   │   ├─ default/
│   │   │   ├─ visitor_01.png
│   │   │   ├─ visitor_02.png
│   │   └─ premium/
│   │       ├─ visitor_vip_01.png
│   ├─ workers/
│       ├─ service/
│       ├─ security/
│       └─ admin/
├─ buildings/
│   ├─ hotels/
│   ├─ restaurants/
│   ├─ casinos/
├─ upgrades/
│   ├─ building/
│   ├─ worker/
│   └─ city/
└─ effects/
    ├─ income/
    ├─ skills/
    └─ alerts/
````

Le moteur doit pouvoir :

* sélectionner un sprite :

  * aléatoirement,
  * ou via des règles (type, niveau, état, tags),
* gérer des **fallbacks** (asset par défaut si manquant),
* permettre packs/graphiques alternatifs (skins, mods).

---

### UI & illustrations

Les éléments suivants doivent aussi supporter des images/icônes :

* fiches de bâtiments (popover, sidebar),
* fiches de personnel,
* compétences (nœuds d’arbres),
* améliorations,
* passifs,
* événements & alertes.

Chaque donnée de gameplay peut référencer :

* une icône,
* une illustration,
* un sprite ou effet animé.

---

## 🔧 Spécifications techniques & rigueur

### Stack

* Next.js (React)
* Pixi.js
* TypeScript strict
* Architecture **data-driven**, moteur agnostique côté design

### Contraintes strictes

* ❌ Aucun déplacement diagonal (pathfinding orthogonal)
* ⏸ Pause parfaite :

  * timers ajustés,
  * pas de déclenchement instantané à la reprise
* 🧠 Calculs déterministes, traçables, facilement loggables
* 🖱 Curseur **toujours en croix** sur le canvas de jeu
* 🧱 Routes non interactives (pas de sélection, pas de clic payant)
* 🎛 UI claire, minimaliste, pédagogique (tooltips courts, explicites)
* 🎨 Aucun sprite “codé en dur” : tout passe par les définitions d’assets/règles

Le code doit rester :

* lisible,
* extensible,
* exploitable par un agent IA ou un développeur solo,
* découplé du style graphique concret.

---

## 1️⃣0️⃣ TODO — Avancement du projet

### ✅ Fondations déjà en place

* [x] Grille orthogonale et placement centré sur les cases
* [x] Routes & pathfinding sans diagonales
* [x] Personnes autonomes se déplaçant sur les routes
* [x] Entrée visuelle des personnes dans les bâtiments
* [x] Bâtiments produisant automatiquement de l’argent
* [x] Production passive basée sur :

  * le type de bâtiment,
  * son niveau,
  * le nombre d’occupants
* [x] Système de pause / reprise propre (bâtiments + personnages)
* [x] UI globale (barre supérieure) : argent, personnes en déplacement, occupation par type de bâtiment
* [x] Popovers de bâtiments contextuels au-dessus du bâtiment sélectionné
* [x] Tooltips économiques simples et lisibles
* [x] Curseur en croix sur la zone de jeu

---

### ⏳ En cours / prochaines étapes priorisées

* [x] Différenciation claire **visiteurs / personnel**
* [x] Système d’assignation intelligente du personnel aux bâtiments
* [x] Implémentation complète du **modèle de données** (ville, passifs, workers, visitors, skills, traits)
* [x] Moteur de simulation par tick (temps logique unifié)
* [x] Résolveur de passifs & procs (skills conditionnels + cooldowns)
* [x] Système de réputation dynamique (locale, premium, régulation)
* [x] Système de sprites pour visiteurs (map + portrait + icône)
* [x] Système de sprites pour personnel (map + portrait + icône)
* [x] Loader d’assets data-driven (hiérarchie de dossiers, packs, overrides)
* [x] Règles de sélection de sprites (SpriteRule, tags, variantes)
* [x] Icônes & illustrations de compétences (arbres de skills)
* [x] Effets visuels légers (skills, revenus, alertes d’état)

---

### 🚀 Vision long terme

* [x] Compétences actives & passives pour bâtiments et personnel
* [x] Événements dynamiques (afflux, contrôles, incidents abstraits)
* [x] IA décisionnelle avancée pour visiteurs & personnel
* [ ] Spécialisation de quartiers (zones thématiques, bonus contextuels)
* [ ] Économie multi-niveaux (coûts d’entretien, salaires, taxes abstraites)
* [ ] Sauvegarde / reprise complète (ville, personnel, arbres de compétences, assets actifs)
* [ ] Support complet de packs graphiques / mods (thèmes visuels alternatifs)

---

## 🎯 Intention finale

Mini City Tycoon est pensé comme :

> Une **simulation de gestion adulte, élégante, systémique et modulaire**,
> où chaque entité est à la fois **calculable** et **observable**,
> et où le moteur de simulation peut vivre indépendamment de son habillage graphique.

Un projet :

* orienté systèmes plutôt que narration explicite,
* prêt pour le modding et l’extension,
* compréhensible et manipulable par une IA comme par un humain,
* conçu pour évoluer en **vrai Game Design Document formel** sans réécriture majeure.