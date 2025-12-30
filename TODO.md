## 1️⃣ Analyse technique & produit (courte)

1. Architecture React/Next avec rendu Pixi via composants `pixi`/`components`, pas de découpage clair des couches simulation vs UI.  
2. Assets UI basiques, absence d’HUD structuré pour ressources, temps, dettes.  
3. Pas d’indicateurs visibles de notoriété, besoins des personnes ou dette mensuelle.  
4. Boucle d’attraction des personnes et consommation non matérialisée, aucune jauge d’occupation ou de satisfaction.  
5. Gestion des travailleuses non représentée (métiers, compétences, repos), aucune vue planning.  
6. Construction limitée à routes/bâtiments sans feedback de coût ni de portée des services.  
7. Temps réel non cadré (pas de contrôle vitesse/pause), absence de calendrier mensuel pour dette.  
8. Aucun tutoriel ou objectifs courts pour guider les premiers pas.  
9. Manque de surface pour montrer arbres de passif/niveaux des personnes et compétences des travailleuses.  
10. Feedback sonore/visuel quasi absent lors de placement ou revenus/dépenses.  
11. Pas de récap des finances (revenus par bâtiment, charges, dette).  
12. Navigation carte basique, pas de mode inspection des bâtiments/personnes.  
13. Pas de pipeline de données centralisée (store) pour synchroniser simulation et UI.  
14. Les bâtiments de support (repos/nourriture/services) n’ont pas de métriques d’efficacité affichées.  
15. Les besoins/désirs individuels ne sont pas visibles ni agrégés.  
16. Absence de file d’attente ou logique d’affluence pour bâtiments de plaisir.  
17. Pas de notion de capacité financière des visiteurs affichée pour ajuster l’offre.  
18. Aucune métrique de notoriété affichée ni effet sur flux d’entrants.  
19. Routes n’influencent pas visiblement la circulation ou l’accessibilité.  
20. Pas de sauvegarde/chargement visible ni d’horodatage de session.  
21. Aucun système de notifications pour événements clés (dette, déficit, satisfaction basse).  
22. Pas de backlog ou panneau de tâches guidées.  
23. Pas de validation UX sur la lisibilité (tailwind styles sommaires).  
24. Absence de métriques de performance (FPS, tick time) pour équilibrer temps réel.  
25. Manque d’indicateurs de risque avant placement (coût, maintenance, besoin en personnel).

## 2️⃣ 📌 TODO-LIST (PRIORISÉE)

#### 🟩 P0 – Bloquant UX / Gameplay

* [x] **[ID-001] HUD ressources/temps/dette**
  * Afficher argent, flux mensuel, timer jour/mois, dette mensuelle et échéance
  * Manque de visibilité sur état financier et pression temporelle
  * UI HUD, système temps, finances
  * Le joueur sait en un coup d’œil s’il peut investir et quand payer
* [x] **[ID-002] Panneau notoriété & influx**
  * Indicateur de notoriété et taux d’arrivée des personnes
  * Manque de lien visible entre réputation et fréquentation
  * Simulation attraction, UI statistiques
  * Le joueur comprend comment attirer plus de visiteurs
* [x] **[ID-003] Besoins/désirs visiteurs + capacité financière**
  * Fiche visiteur avec jauges besoins/désirs, budget et passif/niveau
  * Aucune info pour choisir l’offre adaptée
  * Personnes, UI inspection
  * Le joueur adapte ses bâtiments à la demande
* [x] **[ID-004] Planification travailleuses**
  * Vue planning métiers principal/secondaire, disponibilité repos/nourriture/services
  * Affectations opaques, risque de sous-staffing
  * Travailleuses, bâtiments de support, UI planning
  * Le joueur sécurise les horaires et évite la fatigue

#### 🟨 P1 – Profondeur & lisibilité

* **[ID-005] Capacités bâtiments & files**
  * Capacité max, file d’attente, taux de satisfaction par bâtiment de plaisir
  * Affluence non gérée, frustration invisible
  * Bâtiments, personnes, UI bâtiment
  * Le joueur évite saturation et optimise l’accueil
* **[ID-006] Coûts placement & maintenance**
  * Affichage coût initial, maintenance mensuelle, personnel requis avant placement
  * Placements à l’aveugle
  * Construction, finances, UI preview
  * Le joueur décide en connaissance de cause
* **[ID-007] Contrôles temps (pause / x1 / x3)**
  * Boutons vitesse et pause liés au tick simulation
  * Difficulté à réagir et à planifier
  * Temps, boucle simulation, HUD
  * Le joueur gère pression temporelle

#### 🟦 P2 – Améliorations & polish

* **[ID-008] Notifications clés**
  * Alertes pour échéance dette, satisfaction basse, bâtiment saturé
  * Pas d’anticipation des risques
  * Event bus, HUD notifications
  * Le joueur agit avant les crises
* **[ID-009] Tableau de bord finances**
  * Revenus/dépenses par catégorie, projection fin de mois
  * Difficulté à équilibrer comptes
  * Finances, UI dashboard
  * Le joueur identifie les leviers financiers
* **[ID-010] Mode inspection carte**
  * Outil curseur pour survoler routes/bâtiments et voir accessibilité/efficacité
  * Accessibilité routière obscure
  * Chemins, bâtiment, UI overlay
  * Le joueur voit l’impact du réseau
* **[ID-011] Tutoriel objectifs courts**
  * 4–5 quêtes guidant HUD, construction, affectation, paiement dette
  * Onboarding inexistant
  * UI objectifs, triggers simulation
  * Le joueur comprend la boucle de base
* **[ID-012] Feedbacks visuels/sonores placement**
  * Fantôme placement, couleurs valid/invalid, sons de confirmation/erreur
  * Manque de clarté lors du build
  * Construction, input, assets audio
  * Le joueur place sereinement

## 3️⃣ Exécution de la TODO-list (POINT PAR POINT)

### ▶️ TODO [ID-001] – HUD ressources/temps/dette
**Objectif UX / joueur**  
→ Voir instantanément argent, flux mensuel, échéance et statut de dette pour décider vite.

**Design & règles de jeu**  
→ Barre HUD top : argent actuel, revenu mensuel estimé (vert/rouge), compteur jour/mois (30 jours = 1 mois), montant dette mensuelle et bouton “Payer” actif si fonds suffisants. Alerte rouge 3 jours avant échéance. Principe “Simpliste mais pas simple” : peu d’items, couleurs claires, conséquence directe (payer ou défaut).

**Implémentation technique (stack réelle)**  
→ Store (zustand ou équivalent) centralise finances et temps; tick simulation (Pixi loop) met à jour jours. React-pixi lit snapshots via hooks. Action `payDebt()` dans moteur finances; évènement “debt-due” émis si non payé. HUD React dans `app` consomme store.

**UI / UX concrète**  
→ Bandeau haut fixe; clic sur “Payer” consomme fonds, affiche toast de succès/échec. Hover sur dette affiche prochaine échéance. Éviter surcharge : quatre valeurs max, icônes simples.

### ▶️ TODO [ID-002] – Panneau notoriété & influx
**Objectif UX / joueur**  
→ Comprendre comment la notoriété alimente le flux de visiteurs.

**Design & règles de jeu**  
→ Jauge 0–100 notoriété; formule arrivée = base + (notoriété × coeff). Facteurs : satisfaction moyenne (±), saturation (–). “Simpliste mais pas simple” : une jauge, un taux/min affiché.

**Implémentation technique (stack réelle)**  
→ Module attraction calcule taux chaque tick; store expose `reputation` et `influxPerMin`. React panneau latéral. Pixi spawn boucle lit taux. Event “reputation-changed” pour analytics.

**UI / UX concrète**  
→ Panneau droit repliable avec jauge circulaire + chiffre “Entrées/min”. Hover sur jauge montre facteurs contributifs (liste courte). Pas de graphs complexes.

### ▶️ TODO [ID-003] – Besoins/désirs visiteurs + capacité financière
**Objectif UX / joueur**  
→ Adapter l’offre aux besoins réels.

**Design & règles de jeu**  
→ Fiche visiteur : jauges besoins/désirs (0–100), budget (faible/moyen/haut), passif/niveau (icône + niveau). Satisfaction augmente si besoin servi; dépense plafonnée par budget. “Simpliste mais pas simple” : trois jauges max + budget.

**Implémentation technique (stack réelle)**  
→ Entité personne inclut `needs`, `wants`, `budget`, `passiveLevel`. Store expose sélection actuelle. Pixi sélection via clic sur sprite; React affiche fiche.

**UI / UX concrète**  
→ Paneau inférieur contextuel : portrait, jauges colorées, badge budget, texte court “Cherche : plaisir/repas”. Clic sur personne ouvre; clic vide ferme.

### ▶️ TODO [ID-004] – Planification travailleuses
**Objectif UX / joueur**  
→ S’assurer que bâtiments sont staffés et travailleuses reposées.

**Design & règles de jeu**  
→ Planning journalier en blocs de 3h; assignation métier principal/secondaire par créneau; besoin de repos/nourriture/services après X heures. Fatigue augmente si dépasse. “Simpliste mais pas simple” : grille simple, conséquences fatigue/inefficacité.

**Implémentation technique (stack réelle)**  
→ Store `workers` avec `schedule[]`. Moteur tick consomme planning pour activer rôles et appliquer fatigue. React planning modal (Tailwind grid). Pixi applique performances selon fatigue.

**UI / UX concrète**  
→ Bouton “Planning” dans HUD; modal avec lignes travailleuses, colonnes temps; drag pour assigner; couleurs : vert actif, bleu secondaire, gris repos. Tooltip sur fatigue. Éviter micro-slots <1h.

### ▶️ TODO [ID-005] – Capacités bâtiments & files
**Objectif UX / joueur**  
→ Éviter saturation et améliorer satisfaction.

**Design & règles de jeu**  
→ Chaque bâtiment de plaisir : capacité simultanée, file max, satisfaction = service × confort – attente. File déborde → visiteurs partent insatisfaits. “Simpliste mais pas simple” : trois nombres.

**Implémentation technique (stack réelle)**  
→ Bâtiment entité ajoute `capacity`, `queueMax`. Simulation personnes gère file FIFO. Store expose stats par bâtiment. React carte affiche badges.

**UI / UX concrète**  
→ Survol bâtiment montre capacité utilisée/queue. Badge couleur (vert<70%, orange<100%, rouge déborde). Éviter tableaux lourds.

### ▶️ TODO [ID-006] – Coûts placement & maintenance
**Objectif UX / joueur**  
→ Construire en conscience du coût total.

**Design & règles de jeu**  
→ Fantôme placement affiche coût initial, maintenance mensuelle, personnel requis. Si fonds insuffisants, fantôme rouge. “Simpliste mais pas simple” : trois infos.

**Implémentation technique (stack réelle)**  
→ Catalogue bâtiments inclut coûts/maintenance/staff. Preview React/Pixi overlay. Validation côté moteur construction; empêche placement si fonds insuffisants.

**UI / UX concrète**  
→ Barre latérale build : clic prévisualise; curseur montre fantôme coloré; tooltip fixe en bas. Son erreur si refus. Pas d’onglets multiples.

### ▶️ TODO [ID-007] – Contrôles temps (pause / x1 / x3)
**Objectif UX / joueur**  
→ Gérer pression temporelle.

**Design & règles de jeu**  
→ Boutons pause, x1, x3; pause arrête ticks simulation; x3 multiplie delta temps. “Simpliste mais pas simple”: trois états exclusifs.

**Implémentation technique (stack réelle)**  
→ Moteur temps avec multiplicateur; Pixi loop multiplie delta; store expose `timeScale`. React boutons toggles.

**UI / UX concrète**  
→ HUD haut droite : trois boutons avec état actif; raccourcis barre espace (toggle pause). Feedback: glow actif, grisé si en cinématique.

### ▶️ TODO [ID-008] – Notifications clés
**Objectif UX / joueur**  
→ Anticiper risques sans surveiller tout.

**Design & règles de jeu**  
→ Notifications toast pour dette proche, satisfaction moyenne <50, bâtiment saturé >100% 30s. “Simpliste mais pas simple”: messages courts, action “Voir”.

**Implémentation technique (stack réelle)**  
→ Event bus; triggers depuis finances, satisfaction module, bâtiment module. React toast manager abonné au store. Liens vers entités.

**UI / UX concrète**  
→ Pop en haut droit, auto-hide 6s, clic recentre caméra sur entité. Pas de spam: throttle par type.

### ▶️ TODO [ID-009] – Tableau de bord finances
**Objectif UX / joueur**  
→ Décider où couper ou investir.

**Design & règles de jeu**  
→ Tableau revenus/dépenses par catégorie (billets, services, maintenance, salaires), projection fin de mois. “Simpliste mais pas simple”: 4 lignes + projection.

**Implémentation technique (stack réelle)**  
→ Module finances agrège transactions; store expose `financialSummary`. React panel modal (Tailwind table). Calcul projection = (revenus- dépenses)/jour restant.

**UI / UX concrète**  
→ Bouton “Finances” HUD; modal avec table et sparkline simple. Tooltip sur projection expliquant hypothèse. Éviter filtres complexes.

### ▶️ TODO [ID-010] – Mode inspection carte
**Objectif UX / joueur**  
→ Visualiser accessibilité et efficacité rapidement.

**Design & règles de jeu**  
→ Mode toggle “Inspect” colore bâtiments selon efficacité (vert/rouge) et routes selon accessibilité (connecté/non). “Simpliste mais pas simple”: un mode, deux couleurs.

**Implémentation technique (stack réelle)**  
→ Overlay Pixi : shader/filters sur sprites. Données d’accessibilité depuis graphe routes; efficacité depuis occupation/queue. Store flag `inspectMode`.

**UI / UX concrète**  
→ Bouton dans HUD; activation affiche légende. Survol montre info-bulle succincte. Désactivation via ESC ou bouton. Pas de multi-modes.

### ▶️ TODO [ID-011] – Tutoriel objectifs courts
**Objectif UX / joueur**  
→ Apprendre boucle de base sans surcharge.

**Design & règles de jeu**  
→ 5 objectifs séquentiels: (1) placer route, (2) construire bâtiment plaisir, (3) assigner travailleuse, (4) ouvrir finances HUD, (5) payer dette. Récompense petites primes. “Simpliste mais pas simple”: une étape visible, suivante masquée.

**Implémentation technique (stack réelle)**  
→ Script objectif dans store; triggers sur actions. React checklist bandeau gauche. Persist progression (localStorage). Pixi événements pour détection.

**UI / UX concrète**  
→ Bandeau gauche avec étape active, bouton “Suivant” si condition remplie; feedback check vert. Pas de fenêtres modales bloquantes.

### ▶️ TODO [ID-012] – Feedbacks visuels/sonores placement
**Objectif UX / joueur**  
→ Sécuriser le ressenti de construction.

**Design & règles de jeu**  
→ Fantôme vert/rouge, snap grille; son doux confirmation, buzzer léger en échec. “Simpliste mais pas simple”: deux couleurs, deux sons.

**Implémentation technique (stack réelle)**  
→ Pixi overlay pour fantôme; collision/validité côté moteur; charge sons depuis `public`. React passes placement state.

**UI / UX concrète**  
→ Pendant drag placement, fantôme semi-transparent; clic confirme, son joue. Tooltip erreur concise. Pas d’animations longues.
