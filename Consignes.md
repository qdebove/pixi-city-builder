# Consignes de développement — Mini City Tycoon (règles agent)

Ce document définit les règles **obligatoires** qu’un agent doit respecter pour générer du code cohérent, robuste et maintenable sur Mini City Tycoon.

---

## 1) Principes non négociables

- **Ne rien casser** : toute modif conserve l’existant sauf demande explicite.
- **Simplicité maintenable** : choisir la solution la plus simple qui marche.
- **Data-driven en priorité** : pas d’exemples en dur quand une définition JSON/contrat suffit.
- **Déterminisme et traçabilité** : chaque calcul doit être explicable et loggable.

---

## 2) Stack & qualité TypeScript

- Next.js (React) + Pixi.js + TypeScript strict.
- `strict: true` attendu.
- `any` interdit sauf cas exceptionnel isolé et commenté.
- Utiliser des types exacts (unions, discriminated unions) plutôt que “souples”.

---

## 3) Architecture obligatoire

### Séparation stricte

- **Simulation (moteur)** : temps, ticks, économie, IA, pathfinding, règles.
- **Rendu Pixi** : sprites, animations, zIndex, interpolation visuelle.
- **UI React** : panneaux, popups, intentions utilisateur.

Interdits :
- logique de jeu dans React,
- dépendance moteur → React,
- chemins d’assets hardcodés dans le rendu.

---

## 4) Invariants gameplay

### 4.1 Déplacements

- ❌ Aucune diagonale **jamais**.
- Toute trajectoire doit être **Manhattan** (segments N/E/S/W).
- Interdiction d’interpolation visuelle qui “coupe en diagonale” entre cellules : si un perso passe d’un centre de case à un autre, il doit traverser un chemin orthogonal (segments).

### 4.2 Pause parfaite (temps figé)

- Pause stoppe : revenus, déplacements, cooldowns, procs, timers, animations dépendantes du temps.
- À la reprise : pas de “tick instantané” dû à un delta.
- Toute mécanique temporelle doit stocker `lastTickAt` / `cooldownUntilTick` et ajuster selon la pause.

### 4.3 Routes et interactions

- Routes non sélectionnables comme bâtiment productif.
- Routes ne masquent jamais les personnages (zIndex cohérent).
- Construction routes en “peinture” doit respecter :
  - orthogonalité,
  - collisions/occupation,
  - cohérence perf (pas de recalcul global par pixel de souris).

### 4.4 Bâtiments tailles variables

- Les bâtiments peuvent être 1x1, 1x2, 2x2, etc.
- Le placement doit vérifier :
  - toutes les cellules occupées,
  - bornes,
  - collisions.
- Les règles d’adjacence (route-contact) doivent considérer le contour (N/E/S/W), pas de diagonale.

---

## 5) Temps long terme & dette

- Implémenter un système de temps logique :
  - jour / heure locale / mois.
- Les mois déclenchent :
  - remboursement de dette obligatoire,
  - dette qui grossit (formule data-driven).
- Le temps doit être compatible pause/reprise et sauvegarde/reprise.

---

## 6) Économie & réputation & sécurité

### Réputation

- Score global pouvant être **négatif**.
- Toute compétence (bâtiment/staff) peut avoir des prérequis :
  - argent minimum,
  - réputation minimum OU maximum (ex : nécessite réputation ≤ -10).
- Ces prérequis doivent être data-driven (contrat), jamais hardcodés dans l’UI.

### Sécurité / délinquance

- Score global affiché.
- Gardes (workers) patrouillent :
  - entités visibles sur la carte,
  - pathfinding orthogonal,
  - impact mesurable sur la sécurité (data-driven).

---

## 7) Contrats data-driven obligatoires

### 7.1 Assets / sprites

- Aucun sprite hardcodé.
- Toute sélection visuelle passe par :
  - `AssetDefinition`
  - `SpriteRule`
  - resolver + fallback.
- L’accès aux images doit être optimisé :
  - cache,
  - atlas,
  - pooling d’affichages temporaires (ex : image travailleuse au-dessus bâtiment).

### 7.2 Skills / procs / conditions

- Les activations de compétences doivent être décrites via contrats :
  - `SkillTrigger`
  - `Condition`
  - `ProcSpec` (chance, cooldown, maxPerWindow, costs)
- Aucune logique “if/else” dispersée : centraliser l’évaluation dans un moteur de procs.

### 7.3 Definitions JSON (objectif)

- Retirer les exemples en dur dans le code.
- Bâtiments, jobs, skills, passifs, visitors archetypes, economy, debt, time settings :
  - doivent être chargeables via JSON.
- Le code doit supporter des “defaults” + overrides (modding/packs).

---

## 8) UI : règles et exigences

- Barre de construction doit devenir **horizontale en bas**.
- Popups d’infos :
  - doivent être déplaçables (drag),
  - doivent réserver une zone image :
    - affichée grisée + floue si non débloqué,
  - doivent rester accessibles (scroll si nécessaire).
- Arbres de compétences :
  - affichage horizontal,
  - scrollable,
  - lisible (icônes, connexions simples).
- Personnages non-staff :
  - pas d’arbre de skills,
  - barre d’XP visible qui modifie stats.

Effets visuels :
- Lorsqu’un service implique une travailleuse :
  - afficher temporairement son image au-dessus du bâtiment (fade-out),
  - doit être poolé/caché (pas de création massive non contrôlée).

---

## 9) Rendu Pixi : perf et ordering

- `zIndex` explicite pour tout nouvel élément.
- Ne pas instancier des objets lourds par frame (TextStyle/Graphics).
- Utiliser pooling pour :
  - effets temporaires (images, alertes),
  - affichages répétitifs.
- Pas de scans globaux inutiles : préférer index/maps (O(1)).

---

## 10) Validation centralisée (moteur)

- Toutes les règles (achat, prereq réputation/argent, placement, tailles, route-contact, déblocages) :
  - sont validées dans le moteur.
- L’UI peut désactiver des boutons, mais ne doit jamais être le seul garde-fou.

---

## 11) Checklist obligatoire avant livraison

- [ ] Aucun déplacement diagonal possible (visuel + logique)
- [ ] Pause parfaite (aucun tick instantané après reprise)
- [ ] Temps (jour/mois) et dette ne cassent pas la simulation
- [ ] Réputation négative supportée + prereq argent/réputation data-driven
- [ ] Sécurité affichée + gardes patrouillent orthogonalement
- [ ] Popups : image slot + flou/gris si lock + draggable
- [ ] Arbres de compétences horizontaux scrollables
- [ ] Construction bar en bas + routes “peinture” stable
- [ ] Bâtiments tailles variables : placement/collisions OK
- [ ] Aucun asset hardcodé + resolver + fallback
- [ ] Optimisation accès images (cache/atlas/pooling)
- [ ] Aucun leak (ticker/listeners) après destroy

---

## 12) Format de rendu attendu d’un agent

- Fournir les fichiers complets modifiés (copier-coller).
- Après chaque fichier : 2–3 phrases max expliquant :
  - ce qui change,
  - pourquoi,
  - quels invariants sont garantis.
- Si une décision implique un compromis : expliciter le compromis et l’alternative.