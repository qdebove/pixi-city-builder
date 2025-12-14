'use client';
import { BuildingDetails } from '@/components/BuildingDetails';
import { BuildingSidebar } from '@/components/BuildingSidebar';
import { EventTicker } from '@/components/EventTicker';
import { MainMenuOverlay, MenuTab } from '@/components/MainMenuOverlay';
import { PersonDetailsPanel } from '@/components/PersonDetailsPanel';
import { Game, GameUIState } from '@/pixi/Game';
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
  });
  const [draggingType, setDraggingType] = useState<BuildingType | null>(
    null
  );
  const [panelPosition, setPanelPosition] = useState({ x: 12, y: 12 });
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

  const openMenu = (tab: MenuTab) => {
    setMenuTab(tab);
    setIsMenuOpen(true);
  };

  const handleStateChange = useCallback((newState: GameUIState) => {
    setGameState(newState);
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

  const formatClock = () => {
    const hour = gameState.time.hour.toString().padStart(2, '0');
    return `Mois ${gameState.time.month} • Jour ${gameState.time.day} • ${hour}:00`;
  };

  const formatDebt = () =>
    `${formatMoney(gameState.debt.balance)} restantes`;

  const handleClosePerson = () => gameRef.current?.deselectPerson();

  const selectionContent = gameState.selectedPerson ? (
    <PersonDetailsPanel person={gameState.selectedPerson} />
  ) : selectedType && gameState.selectedBuildingState ? (
    <BuildingDetails
      type={selectedType}
      state={gameState.selectedBuildingState}
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

  const panelScale =
    gameState.zoom > 0
      ? Math.max(0.85, Math.min(1.1, 1 / gameState.zoom))
      : 1;

  return (
    <div className="relative h-screen w-screen bg-slate-900 text-white select-none overflow-hidden">
      {/* Barre globale en haut */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-slate-900/95 border-b border-slate-800">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-sky-400">
            Mini City Tycoon
          </span>
          <span className="text-xs text-slate-400">
            Ticks de production :{' '}
            {gameState.totalClicks.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">
              Banque
            </span>
            <span className="font-mono font-semibold text-amber-300">
              {formatMoney(gameState.money)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">
              Calendrier local
            </span>
            <span className="font-mono font-semibold text-cyan-200">
              {formatClock()}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">
              Dette mensuelle
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-semibold text-rose-200">
                {formatMoney(gameState.debt.lastPayment || DEBT_SETTINGS.minimumPayment)}
              </span>
              <span className="text-[11px] text-slate-400">due ce mois</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Solde : <span className="font-mono text-slate-100">{formatDebt()}</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">
              Flux en déplacement
            </span>
            <div className="flex gap-3 text-[13px]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-pink-300" />
                <span className="font-mono text-pink-200">
                  {gameState.peopleByRole.visitor}
                </span>
                <span className="text-slate-400 text-[11px]">visiteurs</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-300" />
                <span className="font-mono text-sky-200">
                  {gameState.peopleByRole.staff}
                </span>
                <span className="text-slate-400 text-[11px]">personnel</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] uppercase text-slate-400">
              Occupation des bâtiments
            </span>
            <div className="flex gap-3 flex-wrap">
              {BUILDING_TYPES.filter((t) => !t.isRoad).map(
                (type) => (
                  <div key={type.id} className="flex items-center gap-1">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: `#${type.color
                          .toString(16)
                          .padStart(6, '0')}`,
                      }}
                    />
                    <span className="text-slate-300">
                      {type.name}:{' '}
                      <span className="font-mono text-emerald-300">
                        {gameState.occupantsByType[type.id] || 0}
                      </span>
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">
              Réputation
            </span>
            <div className="flex gap-3 text-[13px]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-300" />
                <span className="font-mono text-emerald-200">
                  {gameState.reputation.local.toFixed(1)}
                </span>
                <span className="text-slate-400 text-[11px]">locale</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-300" />
                <span className="font-mono text-amber-200">
                  {gameState.reputation.premium.toFixed(1)}
                </span>
                <span className="text-slate-400 text-[11px]">premium</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-300" />
                <span className="font-mono text-red-200">
                  {gameState.reputation.regulatoryPressure.toFixed(1)}
                </span>
                <span className="text-slate-400 text-[11px]">régulation</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">
              Répartition globale
            </span>
            <div className="flex gap-3 text-[13px]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-pink-300" />
                <span className="font-mono text-pink-200">
                  {gameState.occupantsByRole.visitor}
                </span>
                <span className="text-slate-400 text-[11px]">visiteurs hébergés</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-300" />
                <span className="font-mono text-sky-200">
                  {gameState.occupantsByRole.staff}
                </span>
                <span className="text-slate-400 text-[11px]">personnel en poste</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openMenu('buildings')}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Bureau d&apos;urbanisme
          </button>
          <button
            onClick={() => openMenu('skills')}
            className="rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
          >
            Arbres de compétences
          </button>
          <button
            onClick={() => openMenu('people')}
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            Fiches personnes
          </button>
        </div>

        <div className="flex gap-3">
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

      <EventTicker events={gameState.activeEvents} />

      {/* Layout principal */}
      <div className="flex h-[calc(100vh-40px)] w-full pt-0">
        <div className="w-[300px] shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col p-4 shadow-2xl z-10 overflow-y-auto">
          <BuildingSidebar
            money={gameState.money}
            totalClicks={gameState.totalClicks}
            onSelect={handleSelectBuildingToBuild}
            draggingMode={draggingType}
            onOpenMenu={openMenu}
          />
        </div>

        <div className="relative grow bg-slate-950">
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
      />
    </div>
  );
};

export default Home;
