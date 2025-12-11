'use client';
import { BuildingDetails } from '@/components/BuildingDetails';
import { BuildingSidebar } from '@/components/BuildingSidebar';
import { Game, GameUIState } from '@/pixi/Game';
import { BUILDING_TYPES, BuildingType } from '@/types/types';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const Home: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [gameState, setGameState] = useState<GameUIState>({
    money: 1000,
    totalClicks: 0,
    selectedBuildingState: null,
    isPaused: false,
  });
  const [draggingType, setDraggingType] = useState<BuildingType | null>(null);

  const handleStateChange = useCallback((newState: GameUIState) => {
    setGameState(newState);
  }, []);

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      gameRef.current = new Game(gameContainerRef.current, handleStateChange);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [handleStateChange]);

  const handleSelectBuildingToBuild = (type: BuildingType | null) => {
    if (gameRef.current) {
      gameRef.current.setDragMode(type);
      setDraggingType(type);
    }
  };

  const handleUpgrade = () => gameRef.current?.upgradeSelectedBuilding();
  const handleToggleAutoClicker = () => gameRef.current?.toggleAutoClicker();
  const handleUpgradeAutoClicker = () =>
    gameRef.current?.upgradeAutoClickerSpeed();

  const handlePause = () => gameRef.current?.pause();
  const handleResume = () => gameRef.current?.resume();

  const selectedType = gameState.selectedBuildingState
    ? BUILDING_TYPES.find(
        (t) => t.id === gameState.selectedBuildingState!.typeId
      )
    : null;

  return (
    <div className="relative h-screen w-screen bg-slate-900 text-white select-none overflow-hidden">
      {/* Boutons Pause / Reprendre */}
      <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        <button
          onClick={handlePause}
          disabled={gameState.isPaused}
          className={`pointer-events-auto px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition 
            ${
              gameState.isPaused
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
        >
          ⏸ Mettre en pause
        </button>
        <button
          onClick={handleResume}
          disabled={!gameState.isPaused}
          className={`pointer-events-auto px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition 
            ${
              !gameState.isPaused
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
        >
          ▶ Reprendre
        </button>
      </div>

      {/* Layout principal */}
      <div className="flex h-full w-full">
        {/* Sidebar UI */}
        <div className="w-[300px] shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col p-4 shadow-2xl z-10">
          <BuildingSidebar
            money={gameState.money}
            totalClicks={gameState.totalClicks}
            onSelect={handleSelectBuildingToBuild}
            draggingMode={draggingType}
          />

          {gameState.selectedBuildingState && selectedType && (
            <BuildingDetails
              type={selectedType}
              state={gameState.selectedBuildingState}
              money={gameState.money}
              onUpgrade={handleUpgrade}
              onToggleAutoClicker={handleToggleAutoClicker}
              onUpgradeAutoClicker={handleUpgradeAutoClicker}
            />
          )}
        </div>

        {/* Pixi Canvas */}
        <div ref={gameContainerRef} className="grow relative bg-slate-950" />
      </div>
    </div>
  );
};

export default Home;
