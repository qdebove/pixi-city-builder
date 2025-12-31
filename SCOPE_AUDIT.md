# SCOPE_AUDIT.md — Inventaire & désactivation (V0)

## 1) Résumé exécutif

Objectif V0 (source : GAME_V0_CONTRACT.md) :

- Placement bâtiments (contraintes + coût)
- Revenu passif
- Temps (jours → mois)
- Dette mensuelle avec remboursement manuel, prélèvement fin de mois, et **Game Over brutal** si fonds insuffisants
- Population : spawn + déplacement sur routes + entrée/sortie bâtiments

Règles de décision (ordre) :

1. README.md + Consignes.md = référents globaux
2. GAME_V0_CONTRACT.md = périmètre exécutable V0
3. SCOPE_AUDIT.md = inventaire/plan de désactivation
4. TODO.md, TODO-UX.md = backlog post-V0

Comptage (initial, basé sur arborescence) :

- CORE V0 : simulation temps/éco/dette + placement + people + rendu de base
- SUPPORT V0 : UI notifications, floating text, helpers
- HORS-SCOPE : recrutement, planning, skills, réputation/sécurité, événements riches, menus complexes, gestion sauvegardes via panneau

Risques majeurs identifiés (à valider en code) :

- app/page.tsx importe et branche une UI riche + des systèmes hors-scope (menus/panels)
- certains systèmes hors-scope peuvent être couplés au tick principal (EventSystem/AttractionSystem/DistrictSystem)
- risque de side-effects via imports (ex: systèmes instanciés par défaut)
- absence de centralisation des feature flags : modules hors-scope instanciés par défaut
- Game Over dette non implémenté explicitement (prélèvement fin de mois à sécuriser)

---

## 2) Feature flags & stratégie de désactivation (norme V0)

Stratégies autorisées (préférence dans cet ordre) :
A) Non-montage UI : ne pas rendre le composant (ne pas l’importer si possible)
B) Feature flag centralisé : `config/features.ts`
C) Route/page non branchée : conserver l’UI en page secondaire (ex: /legacy)
D) Isolement : déplacer en `legacy/` si nécessaire (optionnel, à faire seulement si ça simplifie)

Fichier de flags :

- `config/features.ts` (racine, compatible alias @/\*)
- Flags attendus (par défaut `false` hors V0) : `ENABLE_LEGACY_UI`, `ENABLE_RECRUITMENT`, `ENABLE_SKILLS`, `ENABLE_REPUTATION`, `ENABLE_SECURITY`, `ENABLE_EVENTS`, `ENABLE_DISTRICTS`, `ENABLE_ATTRACTION_AI`, `ENABLE_SAVE_MANAGER_UI`, `ENABLE_ASSET_PACK_UI`, `ENABLE_TUTORIAL`.
- Risques de couplage : Game.ts instancie par défaut AttractionSystem/EventSystem/DistrictSystem/ReputationSystem/SecuritySystem/SkillEngine ; PeopleManager s’appuie sur DecisionAI. Ces modules doivent lire les flags pour rester neutres en V0.

---

## 3) Table d’audit — Simulation Pixi (pixi/\*)

### 3.1 CORE V0 (à garder actif)

1. SimulationClock

- Statut : CORE V0
- Emplacement : pixi/SimulationClock.ts
- Stratégie : actif
- Validation : tick stable, pas de double-trigger

2. Time System (jours/mois)

- Statut : CORE V0
- Emplacement : pixi/TimeSystem.ts + pixi/data/time-settings.(ts|json)
- Stratégie : actif
- Validation : incrément jour/mois cohérent

3. Economy System (revenu passif)

- Statut : CORE V0
- Emplacement : pixi/EconomySystem.ts + pixi/data/economy-settings.(ts|json)
- Stratégie : actif
- Validation : l’argent augmente selon règles simples

4. Debt System (dette mensuelle)

- Statut : CORE V0
- Emplacement : pixi/DebtSystem.ts
- Stratégie : actif, ajouter Game Over brutal fin de mois si impayé (V0)
- Validation : fin de mois => prélèvement ; si fonds insuffisants => Game Over

5. Placement / bâtiments

- Statut : CORE V0
- Emplacement : pixi/BuildingManager.ts, pixi/Building.ts, pixi/BuildZoneSystem.ts
- Validation : placement bloqué si case occupée ; coût débité

6. Population (déplacement + entrée bâtiments)

- Statut : CORE V0
- Emplacement : pixi/PeopleManager.ts, pixi/Person.ts, pixi/data/person-factory.ts
- Validation : spawn + mouvement fluide ; entrée/sortie possible

7. Game orchestration & view

- Statut : SUPPORT→CORE (selon rôle exact)
- Emplacement : pixi/Game.ts, pixi/WorldView.ts
- Stratégie : rester, mais s’assurer que seuls les systèmes V0 sont branchés par défaut (lecture des flags pour Attraction/Event/District/Reputation/Sécurité/Skills). Overlay districts et events doivent être neutralisés quand désactivés.
- Validation : une partie V0 tourne sans systèmes hors-scope ; pas d’overlay district si flag désactivé

### 3.2 SUPPORT V0 (conserver minimal)

8. NotificationCenter (moteur)

- Statut : SUPPORT V0
- Emplacement : pixi/NotificationCenter.ts
- Validation : messages simples (placement refusé, dette payée, etc.)

9. FloatingText / IncomePulse / ServiceFlash

- Statut : SUPPORT V0
- Emplacement : pixi/FloatingText.ts, pixi/IncomePulse.ts, pixi/ServiceFlash.ts
- Stratégie : garder seulement si utile au feedback minimal (sinon désactiver via flag UI_FX)
- Validation : pas d’effets lourds, pas d’impact perf

### 3.3 HORS-SCOPE (désactiver mais conserver)

10. EventSystem (événements riches)

- Statut : HORS-SCOPE
- Emplacement : pixi/EventSystem.ts + pixi/data/(unlocks|ui-layout).(ts|json) (si utilisé pour menus)
- Désactivation : flag ENABLE_EVENTS=false ; ne pas instancier dans Game par défaut et retourner des modifiers neutres (x1)
- Validation : V0 jouable sans ticker/événements, pas de moneyDelta externe

11. DistrictSystem (spécialisation)

- Statut : HORS-SCOPE (pour V0 simplifiée)
- Emplacement : pixi/DistrictSystem.ts
- Désactivation : flag ENABLE_DISTRICTS=false (zones vides, overlay non dessiné)
- Validation : placement & économie OK sans districts, multiplicateur x1

12. ReputationSystem / SecuritySystem

- Statut : HORS-SCOPE
- Emplacement : pixi/ReputationSystem.ts, pixi/SecuritySystem.ts
- Désactivation : flags ENABLE_REPUTATION / ENABLE_SECURITY = false ; snapshots neutres, pas de broadcast
- Validation : aucun panneau/règle réputation/sécurité active en V0

13. AttractionSystem / DecisionAI

- Statut : HORS-SCOPE (V0 = déplacement pseudo-aléatoire simple)
- Emplacement : pixi/AttractionSystem.ts, pixi/decision/DecisionAI.ts
- Désactivation : flag ENABLE_ATTRACTION_AI=false ; spawn basique + choix pseudo-aléatoire dans PeopleManager
- Validation : people se déplacent sans IA avancée

14. Skills engine

- Statut : HORS-SCOPE
- Emplacement : pixi/skills/SkillEngine.ts + pixi/data/skill-procs.(ts|json)
- Désactivation : flag ENABLE_SKILLS=false ; aucun import côté V0
- Validation : build OK sans skills

15. Recruitment / schedules data

- Statut : HORS-SCOPE
- Emplacement : pixi/data/recruitment.ts, pixi/data/worker-schedules.ts
- Désactivation : non importé en V0
- Validation : aucun code V0 ne dépend de ces datas

16. Save storage (selon dépendance réelle)

- Statut : SUPPORT V0 (si indispensable) sinon HORS-SCOPE UI
- Emplacement : pixi/data/save-storage.ts
- Stratégie : garder load/persist minimal si requis, mais désactiver le panneau de gestion
- Validation : pas de panneau “Save manager” en V0
- Risque : app/page.tsx charge/écrit automatiquement ; UI de gestion à conditionner via flag ENABLE_SAVE_MANAGER_UI

---

## 4) Table d’audit — UI React (components/\*)

### 4.1 CORE V0 (UI minimale)

1. Building placement UI

- Statut : CORE V0
- Emplacement :
  - components/BuildingSidebar.tsx
  - components/BuildingLibrary.tsx
  - components/BuildingPlacementPreview.tsx
  - components/BuildZoneIndicator.tsx
  - components/BuildingDetails.tsx (si minimal)
- Désactivation : aucun (actif)
- Validation : placement simple, panneaux sobres

2. People details (optionnel)

- Statut : SUPPORT V0 (si simple)
- Emplacement : components/PersonDetailsPanel.tsx
- Stratégie : actif uniquement si ultra minimal ; sinon HORS-SCOPE
- Validation : pas d’UI “gestion” complexe

3. Notifications UI

- Statut : SUPPORT V0
- Emplacement : components/NotificationCenter.tsx
- Validation : notifications simples

### 4.2 HORS-SCOPE (désactiver mais conserver)

- components/MainMenuOverlay.tsx (menu multi-onglets)
- components/EventTicker.tsx (ticker d’événements)
- components/PeopleDirectory.tsx (annuaire/gestion population)
- components/RecruitmentBoard.tsx (recrutement)
- components/WorkerPlanningPanel.tsx (planning)
- components/SkillTreePreview.tsx (skills)
- components/ReputationPanel.tsx (réputation)
- components/SecurityPanel.tsx (sécurité)
- components/SaveManagerPanel.tsx (gestion sauvegarde via UI)
- components/AssetPackPanel.tsx (packs/assets)
- components/TutorialPanel.tsx (si lourd)
- components/InfoImageSlot.tsx (selon usage : souvent SUPPORT, sinon HORS-SCOPE)
- components/EconomyPanel.tsx (panel/indicateurs avancés)

Désactivation standard :

- Ne pas importer dans `app/page.tsx` V0
- Garder le code intact
- Optionnel : route /legacy ou flag ENABLE_LEGACY_UI

Validation :

- Page principale = HUD minimal + placement + affichage simple de la map
- HUD V0 attendu : argent, date (jour/mois), dette (solde + échéance), état du temps (pause/vitesse) + bouton remboursement dette, bannière Game Over dette.
- Aucun menu riche/tutoriel si `ENABLE_LEGACY_UI=false` et `ENABLE_TUTORIAL=false`.

---

## 5) Table d’audit — Next App (app/\*)

- app/page.tsx

  - Statut : CORE V0 (mais doit devenir la version “simple”)
  - Action : remplacer montage UI riche par “V0 screen”
  - Validation : aucun import de panels hors-scope dans la page V0 ; montage HUD minimal + barre de construction simple

- app/layout.tsx, app/globals.css
  - Statut : SUPPORT V0
  - Action : conserver

---

## 6) Journal des décisions (à compléter par Codex)

- 2025-12-31 : V0 impose Game Over brutal si dette impayée fin de mois (exception V0)
- 2025-12-31 : menus/panels avancés désactivés par non-montage + feature flags
- 2025-12-31 : création prévue de `config/features.ts` central (hors-scope à `false`) ; Game/People doivent lire ces flags avant exécution de logique avancée (events/districts/réputation/sécurité/skills/attraction IA/UI legacy)
