'use client';
import { BuildingDetails } from '@/components/BuildingDetails';
import { BuildingSidebar } from '@/components/BuildingSidebar';
import { Game, GameUIState } from '@/pixi/Game';
import { BUILDING_TYPES, BuildingType } from '@/types/types';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const Home: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [gameState, setGameState] = useState<GameUIState>({
    money: 1000,
    totalClicks: 0,
    selectedBuildingState: null,
    isPaused: false,
    movingPeopleCount: 0,
    occupantsByType: {},
    peopleByRole: { visitor: 0, staff: 0 },
    occupantsByRole: { visitor: 0, staff: 0 },
  });
  const [draggingType, setDraggingType] = useState<BuildingType | null>(
    null
  );

  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const handleStateChange = useCallback((newState: GameUIState) => {
    setGameState(newState);

    if (
      newState.selectedBuildingState &&
      gameRef.current &&
      gameContainerRef.current
    ) {
      const p =
        gameRef.current.getSelectedBuildingScreenPosition();
      if (p) {
        const rect =
          gameContainerRef.current.getBoundingClientRect();
        setPopoverPos({
          left: rect.left + p.x,
          top: rect.top + p.y,
        });
      }
    } else {
      setPopoverPos(null);
    }
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
  const handleUpgradeAutoClicker = () =>
    gameRef.current?.upgradeAutoClickerSpeed();

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

  return (
    <div className="relative h-screen w-screen bg-slate-900 text-white select-none overflow-hidden">
      {/* Barre globale en haut */}
      <div className="z-20 flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-slate-800">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-sky-400">
            Mini City Tycoon
          </span>
          <span className="text-xs text-slate-400">
            Ticks de production :{' '}
            {gameState.totalClicks.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
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

      {/* Layout principal */}
      <div className="flex h-[calc(100vh-40px)] w-full pt-0">
        <div className="w-[300px] shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col p-4 shadow-2xl z-10 overflow-y-auto">
          <BuildingSidebar
            money={gameState.money}
            totalClicks={gameState.totalClicks}
            onSelect={handleSelectBuildingToBuild}
            draggingMode={draggingType}
          />
        </div>

        {/* Canvas Pixi : curseur croix sur la zone de jeu */}
        <div
          ref={gameContainerRef}
          className="grow relative bg-slate-950 cursor-crosshair"
        />
      </div>

      {/* Popover de détails */}
      {gameState.selectedBuildingState &&
        selectedType &&
        popoverPos && (
          <div className="pointer-events-none absolute inset-0 z-30">
            {/* overlay clic extérieur, curseur croix aussi */}
            <div
              className="pointer-events-auto absolute inset-0 cursor-crosshair"
              onClick={handleCloseDetails}
            />
            <div
              className="pointer-events-auto absolute"
              style={{
                left: popoverPos.left,
                top: popoverPos.top,
                transform: 'translate(-50%, -110%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <button
                  onClick={handleCloseDetails}
                  className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 text-xs flex items-center justify-center hover:bg-slate-700"
                >
                  ✕
                </button>
                <BuildingDetails
                  type={selectedType}
                  state={gameState.selectedBuildingState}
                  money={gameState.money}
                  onUpgrade={handleUpgrade}
                  onUpgradeAutoClicker={handleUpgradeAutoClicker}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Home;
