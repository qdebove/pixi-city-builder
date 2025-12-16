'use client';
import { BuildingDetails } from '@/components/BuildingDetails';
import { BuildingSidebar } from '@/components/BuildingSidebar';
import { EventTicker } from '@/components/EventTicker';
import { MainMenuOverlay, MenuTab } from '@/components/MainMenuOverlay';
import { PersonDetailsPanel } from '@/components/PersonDetailsPanel';
import { Game, GameUIState } from '@/pixi/Game';
import { BuildZoneIndicator } from '@/components/BuildZoneIndicator';
import { BUILDING_TYPES, BuildingType } from '@/types/types';
import { DEBT_SETTINGS, TIME_SETTINGS } from '@/pixi/data/time-settings';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const Home: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<GameUIState>({
    money: 1000,
    totalClicks: 0,
    selectedBuildingState: null,
    selectedBuildingComputed: null,
    selectedPerson: null,
    isPaused: false,
    movingPeopleCount: 0,
    occupantsByType: {},
    peopleByRole: { visitor: 0, staff: 0 },
    occupantsByRole: { visitor: 0, staff: 0 },
    reputation: {
      local: 50,
      premium: 50,
      regulatoryPressure: 0,
    },
    zoom: 1,
    activeEvents: [],
    time: {
      hour: 0,
      day: TIME_SETTINGS.startDay ?? 1,
      month: TIME_SETTINGS.startMonth ?? 1,
      year: TIME_SETTINGS.startYear ?? 1,
      elapsedMs: 0,
    },
    debt: {
      balance: DEBT_SETTINGS.startingBalance,
      lastPayment: 0,
      totalPaid: 0,
      monthIndex: 0,
    },
    security: { score: 42, guardCoverage: 0 },
    guardPresence: { roaming: 0, stationed: 0 },
    hiredWorkers: [],
    hiredByJob: {},
    economy: {
      dailyMaintenance: 0,
      dailySalaries: 0,
      dailyPassiveIncome: 0,
      lastDailyIncome: 0,
      lastMonthlyTax: 0,
      monthIncome: 0,
      monthExpenses: 0,
      projectedTax: 0,
    },
    districts: { zones: [] },
    buildZone: {
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      nextCost: 0,
      expansionsPurchased: 0,
      maxSize: 0,
    },
  });
  const [draggingType, setDraggingType] = useState<BuildingType | null>(
    null
  );
  const [activeInfoCard, setActiveInfoCard] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 12, y: 12 });
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState(false);
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState(false);
  const [isZonePanelCollapsed, setIsZonePanelCollapsed] = useState(false);
  const dragStateRef = useRef<
    | {
        startX: number;
        startY: number;
        panelX: number;
        panelY: number;
      }
    | null
  >(null);

  const [menuTab, setMenuTab] = useState<MenuTab>('buildings');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const menuLauncherRef = useRef<HTMLDivElement | null>(null);

  const openMenu = (tab: MenuTab) => {
    setMenuTab(tab);
    setIsMenuOpen(true);
    setIsMenuDropdownOpen(false);
  };

  const handleStateChange = useCallback((newState: GameUIState) => {
    setGameState(newState);
  }, []);

  const handleHireWorker = useCallback((workerId: string) => {
    gameRef.current?.hireWorker(workerId);
  }, []);

  const handleExpandZone = useCallback(() => {
    gameRef.current?.expandBuildZone();
  }, []);

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      gameRef.current = new Game(
        gameContainerRef.current,
        handleStateChange
      );
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [handleStateChange]);

  const handleSelectBuildingToBuild = (
    type: BuildingType | null
  ) => {
    if (gameRef.current) {
      gameRef.current.setDragMode(type);
      setDraggingType(type);
    }
  };

  const handleUpgrade = () =>
    gameRef.current?.upgradeSelectedBuilding();

  const handlePause = () => gameRef.current?.pause();
  const handleResume = () => gameRef.current?.resume();
  const handleCloseDetails = () =>
    gameRef.current?.deselectBuilding();

  const selectedType = gameState.selectedBuildingState
    ? BUILDING_TYPES.find(
        (t) => t.id === gameState.selectedBuildingState!.typeId
      )
    : null;

  const formatMoney = (value: number) =>
    value.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    });

  const formatDebt = () =>
    `${formatMoney(gameState.debt.balance)} restantes`;

  const handleClosePerson = () => gameRef.current?.deselectPerson();

  const selectionContent = gameState.selectedPerson ? (
    <PersonDetailsPanel person={gameState.selectedPerson} />
  ) : selectedType && gameState.selectedBuildingState ? (
    <BuildingDetails
      type={selectedType}
      state={gameState.selectedBuildingState}
      computed={gameState.selectedBuildingComputed}
      money={gameState.money}
      onUpgrade={handleUpgrade}
    />
  ) : null;

  const hasDetailPanelOpen = selectionContent !== null;
  const shouldAutoPause = isMenuOpen || hasDetailPanelOpen;

  const autoPauseRef = useRef(false);
  const wasPausedBeforeAuto = useRef(false);

  useEffect(() => {
    if (!gameRef.current) return;

    if (shouldAutoPause) {
      if (!autoPauseRef.current) {
        wasPausedBeforeAuto.current = gameState.isPaused;
        autoPauseRef.current = true;
      }

      if (!gameState.isPaused) {
        gameRef.current.pause();
      }
    } else if (autoPauseRef.current) {
      if (!wasPausedBeforeAuto.current && gameState.isPaused) {
        gameRef.current.resume();
      }
      autoPauseRef.current = false;
    }
  }, [gameState.isPaused, shouldAutoPause]);

  const closeSelection = () => {
    if (gameState.selectedPerson) {
      handleClosePerson();
    } else if (gameState.selectedBuildingState) {
      handleCloseDetails();
    }
  };

  const handleDragMove = useCallback((event: PointerEvent) => {
    if (!dragStateRef.current || !panelRef.current) return;
    const { startX, startY, panelX, panelY } = dragStateRef.current;
    const width = panelRef.current.offsetWidth;
    const height = panelRef.current.offsetHeight;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    const clampValue = (value: number, max: number) =>
      Math.min(Math.max(value, 8), max);

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    setPanelPosition({
      x: clampValue(panelX + deltaX, maxX),
      y: clampValue(panelY + deltaY, maxY),
    });
  }, []);

  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener('pointermove', handleDragMove);
  }, [handleDragMove]);

  const startDrag = useCallback(
    (event: React.PointerEvent) => {
      if (!panelRef.current) return;
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panelX: panelPosition.x,
        panelY: panelPosition.y,
      };
      window.addEventListener('pointermove', handleDragMove);
      window.addEventListener('pointerup', endDrag, { once: true });
    },
    [endDrag, handleDragMove, panelPosition.x, panelPosition.y]
  );

  useEffect(() => {
    if (!gameState.selectedBuildingState && !gameState.selectedPerson) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPanelPosition({ x: 12, y: 12 });
    dragStateRef.current = null;
  }, [gameState.selectedBuildingState, gameState.selectedPerson]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', endDrag);
    };
  }, [endDrag, handleDragMove]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuLauncherRef.current) return;
      if (!menuLauncherRef.current.contains(event.target as Node)) {
        setIsMenuDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const panelScale =
    gameState.zoom > 0
      ? Math.max(0.85, Math.min(1.1, 1 / gameState.zoom))
      : 1;

  const menuOptions: { id: MenuTab; label: string; description: string }[] = [
    {
      id: 'buildings',
      label: 'Bâtiments',
      description: 'Consulter le catalogue complet et les plans débloqués.',
    },
    {
      id: 'skills',
      label: 'Compétences',
      description: 'Arbres, talents et traits clés.',
    },
    {
      id: 'security',
      label: 'Sécurité',
      description: 'Indice global, patrouilles et garde dédiée.',
    },
    {
      id: 'recruitment',
      label: 'Recrutement',
      description: 'Profils disponibles et pré-recrutement.',
    },
    {
      id: 'people',
      label: 'Personnes',
      description: 'Référentiel des visiteurs et du personnel.',
    },
  ];

  type AccentTone = 'amber' | 'sky' | 'emerald' | 'violet' | 'rose';
  const accentClasses: Record<AccentTone, string> = {
    amber: 'border-amber-500/60 shadow-amber-500/10',
    sky: 'border-sky-500/60 shadow-sky-500/10',
    emerald: 'border-emerald-500/60 shadow-emerald-500/10',
    violet: 'border-violet-500/60 shadow-violet-500/10',
    rose: 'border-rose-500/60 shadow-rose-500/10',
  };

  const totalHosted =
    (gameState.occupantsByRole.visitor || 0) +
    (gameState.occupantsByRole.staff || 0);
  const movingCount =
    (gameState.peopleByRole.visitor || 0) +
    (gameState.peopleByRole.staff || 0);

  const infoCards: {
    id: string;
    title: string;
    main: string;
    sub: string;
    extras: string[];
    accent: AccentTone;
  }[] = [
    {
      id: 'finances',
      title: 'Finances',
      main: formatMoney(gameState.money),
      sub: 'Trésorerie mobilisable',
      extras: [
        `Paiement du mois : ${formatMoney(
          gameState.debt.lastPayment || DEBT_SETTINGS.minimumPayment
        )}`,
        `Dette restante : ${formatDebt()}`,
        `Total remboursé : ${formatMoney(gameState.debt.totalPaid)}`,
      ],
      accent: 'amber',
    },
    {
      id: 'calendrier',
      title: 'Calendrier',
      main: `Mois ${gameState.time.month} • Jour ${gameState.time.day}`,
      sub: `${gameState.time.hour.toString().padStart(2, '0')}:00 local`,
      extras: [
        `Année ${gameState.time.year}`,
        `Temps écoulé : ${(gameState.time.elapsedMs / 1000).toFixed(0)}s`,
      ],
      accent: 'sky',
    },
    {
      id: 'population',
      title: 'Population',
      main: `${totalHosted.toLocaleString()} hébergés`,
      sub: `${movingCount.toLocaleString()} en déplacement`,
      extras: [
        `Visiteurs hébergés : ${gameState.occupantsByRole.visitor.toLocaleString()}`,
        `Personnel en poste : ${gameState.occupantsByRole.staff.toLocaleString()}`,
        `Flux visiteurs : ${gameState.peopleByRole.visitor.toLocaleString()}`,
        `Flux personnel : ${gameState.peopleByRole.staff.toLocaleString()}`,
      ],
      accent: 'emerald',
    },
    {
      id: 'reputation',
      title: 'Réputation',
      main: `${gameState.reputation.local.toFixed(1)} locale`,
      sub: 'Indicateur dominant',
      extras: [
        `Premium : ${gameState.reputation.premium.toFixed(1)}`,
        `Pression régulation : ${gameState.reputation.regulatoryPressure.toFixed(1)}`,
        `Production totale : ${gameState.totalClicks.toLocaleString()} ticks`,
      ],
      accent: 'violet',
    },
    {
      id: 'security',
      title: 'Sécurité',
      main: `${gameState.security.score.toFixed(1)} / 100`,
      sub: `Patrouilles ${gameState.guardPresence.roaming} • Postes ${gameState.guardPresence.stationed}`,
      extras: [
        `Couverture : ${gameState.security.guardCoverage.toFixed(1)} zones`,
        `Personnel recruté : ${gameState.hiredWorkers.length}`,
        `Équipe en déplacement : ${gameState.peopleByRole.staff.toLocaleString()}`,
        'Les gardes circulent en trajectoires Manhattan sans diagonale.',
      ],
      accent: 'rose',
    },
  ];

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-900 text-white select-none">
      {/* Barre globale en haut */}
      <div className="relative z-30">
        {isTopBarCollapsed ? (
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-sky-400">
                Mini City Tycoon
              </span>
              <span className="text-xs text-slate-400">
                Tableau réduit
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTopBarCollapsed(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-500 hover:text-white"
              >
                Afficher le tableau
              </button>
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-sky-400">
                  Mini City Tycoon
                </span>
                <span className="text-xs text-slate-400">
                  Table de bord synthétique
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={menuLauncherRef}>
                  <button
                    onClick={() => setIsMenuDropdownOpen((current) => !current)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-sky-500 hover:text-sky-100"
                  >
                    Menu principal
                    <span aria-hidden className="text-slate-300">▾</span>
                  </button>
                  {isMenuDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-2xl">
                      {menuOptions.map((option) => (
                        <button
                          key={option.id}
                          className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                          onClick={() => openMenu(option.id)}
                        >
                          <p className="font-semibold text-white">{option.label}</p>
                          <p className="text-[12px] text-slate-300">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsTopBarCollapsed(true)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
                  >
                    Réduire
                  </button>
                  <button
                    onClick={handlePause}
                    disabled={gameState.isPaused}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition
                      ${
                        gameState.isPaused
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                  >
                    ⏸ Pause
                  </button>
                  <button
                    onClick={handleResume}
                    disabled={!gameState.isPaused}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition
                      ${
                        !gameState.isPaused
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                  >
                    ▶ Reprendre
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {infoCards.map((card) => (
                <div
                  key={card.id}
                  className="group relative"
                  onMouseLeave={() => setActiveInfoCard(null)}
                >
                  <div
                    className={`rounded-xl border ${accentClasses[card.accent]} bg-slate-900/80 px-4 py-3 shadow-lg`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase text-slate-400">
                          {card.title}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {card.main}
                        </p>
                        <p className="text-xs text-slate-300">{card.sub}</p>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          aria-label={`Plus d'options pour ${card.title}`}
                          className="rounded-md border border-transparent px-1 py-0.5 text-lg leading-none transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                          onMouseEnter={() => setActiveInfoCard(card.id)}
                          onFocus={() => setActiveInfoCard(card.id)}
                          onClick={() =>
                            setActiveInfoCard((current) =>
                              current === card.id ? null : card.id
                            )
                          }
                        >
                          ⋯
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-600 px-1.5 py-0.5 text-[10px] uppercase transition hover:border-sky-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                          onMouseEnter={() => setActiveInfoCard(card.id)}
                          onFocus={() => setActiveInfoCard(card.id)}
                          onClick={() =>
                            setActiveInfoCard((current) =>
                              current === card.id ? null : card.id
                            )
                          }
                        >
                          infos
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`absolute left-0 right-0 translate-y-1 opacity-0 transition-all duration-150 ${
                      activeInfoCard === card.id
                        ? 'pointer-events-auto translate-y-2 opacity-100'
                        : 'pointer-events-none'
                    }`}
                  >
                    <div className="mt-1 rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-[12px] text-slate-200 shadow-xl">
                      {card.extras.map((extra, index) => (
                        <p
                          key={`${card.id}-${index}`}
                          className="flex items-start gap-2 leading-relaxed"
                        >
                          <span className="text-slate-500">↳</span>
                          <span>{extra}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EventTicker events={gameState.activeEvents} />

      {/* Layout principal */}
      <div className="relative flex-1 pt-0">
        <div className="absolute inset-0 bg-slate-950">
          <div
            ref={gameContainerRef}
            className="absolute inset-0 cursor-crosshair"
          />

          {selectionContent && (
            <div
              className="pointer-events-none absolute z-30 flex max-w-full"
              style={{ left: panelPosition.x, top: panelPosition.y }}
            >
              <div
                className="pointer-events-auto w-[min(440px,calc(100vw-340px))] max-w-lg origin-top-left"
                style={{ transform: `scale(${panelScale})` }}
                ref={panelRef}
              >
                <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-md">
                  <div
                    className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200"
                    onPointerDown={startDrag}
                  >
                    <span>
                      {gameState.selectedPerson
                        ? 'Fiche personnage'
                        : 'Fiche bâtiment'}
                    </span>
                    <button
                      onClick={closeSelection}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 transition hover:bg-slate-700"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="p-3">{selectionContent}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-4">
          <div className="mx-auto flex max-w-6xl items-end gap-4">
            <div className="pointer-events-auto w-[320px] max-w-full">
              {!isZonePanelCollapsed ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold text-white">Zone de construction</span>
                    <button
                      onClick={() => setIsZonePanelCollapsed(true)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-500"
                    >
                      Masquer
                    </button>
                  </div>
                  <BuildZoneIndicator
                    buildZone={gameState.buildZone}
                    money={gameState.money}
                    onExpand={handleExpandZone}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsZonePanelCollapsed(false)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:border-sky-500 hover:text-white"
                >
                  Afficher la zone de build
                </button>
              )}
            </div>

            <div className="pointer-events-auto flex-1">
              {!isBottomBarCollapsed ? (
                <div className="mx-auto max-w-4xl">
                  <div className="mb-2 flex justify-end">
                    <button
                      onClick={() => setIsBottomBarCollapsed(true)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
                    >
                      Réduire la barre
                    </button>
                  </div>
                  <BuildingSidebar
                    money={gameState.money}
                    totalClicks={gameState.totalClicks}
                    onSelect={handleSelectBuildingToBuild}
                    draggingMode={draggingType}
                    onOpenMenu={openMenu}
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={() => setIsBottomBarCollapsed(false)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-sky-500 hover:text-white"
                  >
                    Afficher la barre de construction
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MainMenuOverlay
        open={isMenuOpen}
        tab={menuTab}
        onTabChange={setMenuTab}
        onClose={() => setIsMenuOpen(false)}
        occupantsByRole={gameState.occupantsByRole}
        movingPeople={gameState.peopleByRole}
        money={gameState.money}
        reputation={gameState.reputation}
        totalClicks={gameState.totalClicks}
        security={gameState.security}
        guardPresence={gameState.guardPresence}
        hiredWorkers={gameState.hiredWorkers}
        hiredByJob={gameState.hiredByJob}
        onHireWorker={handleHireWorker}
        economy={gameState.economy}
        districts={gameState.districts}
      />
    </div>
  );
};

export default Home;
