> **But :** revenir à une V0 jouable, lisible, stable et facilement extensible.  
> **Principe :** la V0 privilégie la simplicité (peu de systèmes) et la robustesse (build vert, perf OK).  
> **Exception V0 assumée :** **Game Over brutal si dette impayée en fin de mois** (voir §4).
>
> **Règles de priorité documentaire :**
>
> 1. **README.md** + **Consignes.md** = référents globaux (architecture/qualité).
> 2. **Ce fichier (GAME_V0_CONTRACT.md)** = référent **d’exécution V0** (périmètre fonctionnel, UX minimale, règles de simulation).
> 3. Tous les autres documents (TODO.md, TODO-UX.md, notes, etc.) = **backlog post-V0** (ne pas implémenter en V0, ne pas enrichir).

---

## 1) Définition de “Done” pour la V0

La V0 est considérée **terminée** quand :

- L’application **démarre** sans erreur, sans console spam, et reste stable plusieurs minutes.
- La boucle de simulation tourne (temps/jours/mois), et les valeurs se mettent à jour de façon cohérente.
- Le joueur peut :
  - **Placer des bâtiments** (avec contraintes de placement + coût).
  - Observer une **génération passive de revenus**.
  - Suivre le **calendrier** (jours qui passent, passage de mois).
  - Voir la **dette** et la **rembourser manuellement**.
  - Subir le **prélèvement automatique** en fin de mois.
  - Perdre immédiatement (**Game Over brutal**) si la dette est impayable en fin de mois (fonds insuffisants).
- Des **personnes se déplacent** sur les routes de façon pseudo-aléatoire, et peuvent **entrer dans des bâtiments**.

---

## 2) Périmètre fonctionnel strict

### 2.1. Features V0 autorisées (CORE)

1. **Carte / grille / terrain**
   - Une zone de jeu affichée.
   - Placement de tuiles : **routes** et **bâtiments** (selon le design actuel).
2. **Placement bâtiments**
   - Validation : pas de placement sur une case occupée.
   - Validation : coût (argent suffisant).
   - Feedback : overlay simple (valid/invalid) + message minimal si refus.
3. **Économie V0**
   - Argent (currency) central.
   - Revenus passifs : calcul simple, compréhensible, stable.
4. **Temps**
   - Temps simulé accéléré (ex: tick -> heure -> jour -> mois).
   - Passage de jour et de mois déclenche des événements déterministes.
5. **Dette mensuelle**
   - Dette visible.
   - Remboursement manuel possible (bouton/action).
   - Fin de mois : prélèvement automatique.
   - **Si fonds insuffisants : Game Over brutal**.
6. **Population**
   - Spawn de personnes.
   - Déplacement sur routes (pseudo-aléatoire, mais fluide).
   - Interaction simple : possibilité d’entrer dans un bâtiment (entrée/sortie).

### 2.2. Features explicitement hors-scope (désactiver mais conserver)

Tout ce qui suit doit être **désactivé proprement** (feature flags / modules non montés / routes non branchées),
**sans suppression** :

- recrutement (travailleuses, gardes, staff)
- systèmes de compétences / arbres / progression complexe
- combat, sécurité, criminalité, réputation (si existant)
- bâtiments “services” avancés (au-delà d’un petit set de base)
- systèmes d’inventaire, crafting, production chaînée
- quêtes, objectifs, tutoriel avancé
- UI complexe : multi-menus, modales, panels empilés, popups détaillées
- analytics, metrics avancées, logs verbeux
- sauvegarde avancée / export / replay (sauf si déjà minimalement indispensable)

---

## 3) UX / UI V0 (simplicité maximale)

### 3.1. Écran unique

- Un seul “mode” principal : **jeu**.
- Pas de sous-écrans multiples en V0 (pas de “gestion”, “recrutement”, “skills”, etc.).

### 3.2. HUD minimal obligatoire

Le HUD V0 doit afficher au minimum :

- **Argent**
- **Date** (jour / mois)
- **Dette restante** + date de prélèvement (ou “fin de mois”)
- **État du temps** (pause / vitesse 1x/2x/4x si existant)

Actions UI V0 autorisées :

- Bouton **Pause / Reprendre**
- Bouton **Vitesse** (optionnel si déjà en place)
- Bouton **Rembourser la dette** (total ou montant fixe simple)

### 3.3. Panneaux / tooltips

- Au clic sur un bâtiment : tooltip/panel simple (1 bloc) :
  - type du bâtiment
  - coût d’entretien (si existant en V0) ou revenu
  - population “dedans” si utile
- Pas de fiches riches, pas de multi-onglets, pas de listes complexes.

### 3.4. Style

- Design “neutre et épuré”.
- Pas d’effets lourds (glow, particules, animations décoratives) en V0.
- Les animations autorisées :
  - hover/selection léger
  - déplacement des personnes
  - feedback placement (valid/invalid)
- Tout le reste : désactivé.

---

## 4) Règles de simulation : temps, économie, dette, game over

### 4.1. Temps

- Un tick de simulation régulier (ex: fixed step).
- Conversion : tick -> heures -> jours -> mois
- Les événements (revenus, prélèvements) doivent être :
  - déterministes
  - idempotents par période (pas de double-trigger)
  - traçables (logs dev minimal si nécessaire)

### 4.2. Revenus passifs

- Au minimum : chaque bâtiment génère un revenu passif simple (ex: par jour).
- Le calcul doit être :
  - stable (pas de flottants non maîtrisés)
  - lisible (fonction dédiée)
  - facilement extensible (config data-driven minimale autorisée)

### 4.3. Dette

- La dette est une somme due **chaque fin de mois**.
- Le joueur peut rembourser avant la fin du mois via action dédiée.
- **Fin de mois :**
  1. calculer montant dû
  2. tenter de prélever sur l’argent
  3. si argent >= dû : payer et continuer
  4. si argent < dû : **Game Over brutal immédiat**
- Le Game Over doit être :
  - clair visuellement (“Dettte impayée”)
  - bloquant (fin de partie)
  - sans ambigüité

### 4.4. Game Over (V0)

Déclencheur unique V0 :

- **Dette impayée lors du prélèvement automatique de fin de mois**.

Conséquences :

- Simulation stoppée
- UI affiche un écran/panneau “Game Over” simple
- Bouton “Recommencer” (reset state) ou “Retour” (optionnel)

---

## 5) Population : déplacement et entrée dans les bâtiments

### 5.1. Déplacement

- Les personnes doivent se déplacer majoritairement **sur routes**.
- Mouvement :
  - fluide
  - sans lag
  - pathing simple (même si naïf) acceptable en V0

### 5.2. Entrée dans bâtiments

- Une personne peut :
  - atteindre un bâtiment via la route
  - “entrer” (disparaître / se marquer comme inside)
  - ressortir après un délai (simple)
- Aucun système de besoins/désirs/argent individuel en V0 (sauf si déjà minimal, sinon hors-scope).

---

## 6) Architecture & code : règles V0

### 6.1. Stratégie “désactiver sans supprimer”

- Tout module hors-scope doit rester dans le codebase mais être :
  - non importé par défaut, OU
  - derrière des **feature flags** centralisés, OU
  - monté uniquement via une route/page non utilisée en V0
- Interdiction de `/* ... */` massifs si ça casse exports/imports : privilégier flags + non-montage.

### 6.2. Feature flags

- Un fichier unique : `src/config/features.ts`
- Tous les flags hors-scope à `false` en V0
- La V0 ne dépend pas d’un flag “advancedUI” pour fonctionner : elle doit être le chemin par défaut.

### 6.3. Isolation V0

- Créer un espace clair :
  - `src/game/v0/*` (simulation + rendu Pixi + glue React si nécessaire)
  - `src/ui/v0/*` (HUD minimal)
- L’existant complexe peut être déplacé en `src/game/legacy/*` ou `src/ui/legacy/*` (optionnel), sinon laissé en place mais **non branché**.

### 6.4. Performance / stabilité

- Pas de recalculs inutiles à chaque frame.
- Les snapshots UI doivent être simples.
- Aucune fuite d’event listeners.
- Logs de debug : minimal, désactivables.

---

## 7) Plan de travail obligatoire (lots)

> Règle : un lot = une PR/commit groupé = build vert + jouable.

### Lot A — “V0 Shell”

- Écran jeu unique + HUD minimal
- Placement bâtiments (déjà existant) stable

### Lot B — “Temps + économie + dette”

- Tick temps (jour/mois)
- Revenus passifs
- Dette + paiement manuel
- Fin de mois : prélèvement + game over si insuffisant

### Lot C — “Population”

- Spawn + déplacement routes
- Entrée/sortie bâtiments

### Lot D — “Polish minimal”

- feedback UI minimal (messages, états)
- corrections perf/bugs
- mini debug overlay (optionnel)

---

## 8) Non-objectifs V0 (anti-dérive)

Interdit en V0 :

- ajouter de nouveaux systèmes “cool” non requis
- enrichir le HUD avec des écrans de gestion
- introduire des arbres, recrutements, jobs, etc.
- refactor complet “architecture idéale” si ça retarde la V0

---

## 9) Checklist finale (à cocher avant de dire “V0 OK”)

- [ ] Build OK, aucun crash au démarrage
- [ ] Placement bâtiments : contraintes + coût + feedback
- [ ] Temps : jours/mois cohérents
- [ ] Revenus passifs : cohérents et traçables
- [ ] Dette : visible + remboursement manuel
- [ ] Fin de mois : prélèvement auto
- [ ] **Game Over brutal** si dette impayée (argent insuffisant)
- [ ] Personnes : spawn + déplacement routes + entrée bâtiments
- [ ] UI : simple, pas de menus complexes
- [ ] Hors-scope : désactivé proprement, conservé (réactivable)

---

## 10) Process V0 — SCOPE_AUDIT obligatoire

Toute fonctionnalité hors périmètre V0 doit être :

- tracée dans `SCOPE_AUDIT.md` (statut + emplacement + stratégie de désactivation),
- désactivée de manière **réversible** (feature flags / non-montage / route non branchée),
- conservée (pas de suppression),
- validée par un build jouable à la fin de chaque lot.
