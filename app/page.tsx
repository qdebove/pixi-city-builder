'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuildZoneIndicator } from '@/components/BuildZoneIndicator';
import { NotificationCenter } from '@/components/NotificationCenter';
import { BuildBar } from '@/components/v0/BuildBar';
import { GameOverBanner } from '@/components/v0/GameOverBanner';
import { V0Hud } from '@/components/v0/V0Hud';
import { Game, GameUIState } from '@/pixi/Game';
import { DebtSystem } from '@/pixi/DebtSystem';
import { EconomySystem } from '@/pixi/EconomySystem';
import { ATTRACTION_SETTINGS } from '@/pixi/data/attraction-settings';
import { ECONOMY_SETTINGS } from '@/pixi/data/economy-settings';
import {
  clearGameSave,
  loadGameSave,
  persistGameSave,
  readSavedMetadata,
} from '@/pixi/data/save-storage';
import { DEBT_SETTINGS, TIME_SETTINGS } from '@/pixi/data/time-settings';
import { BuildingType } from '@/types/types';
import { GameNotification } from '@/types/ui';

const defaultDueDay = DEBT_SETTINGS.dueDay ?? TIME_SETTINGS.daysPerMonth ?? 30;
const defaultDebtSnapshot = new DebtSystem(DEBT_SETTINGS, defaultDueDay).snapshotState();
const defaultEconomySnapshot = new EconomySystem(ECONOMY_SETTINGS, TIME_SETTINGS).snapshot(
  TIME_SETTINGS.startDay ?? 1
);
const defaultAttraction = {
  notoriety: 0,
  influxPerMinute: ATTRACTION_SETTINGS.basePerMinute,
  baseRatePerMinute: ATTRACTION_SETTINGS.basePerMinute,
  reputationContribution: 0,
  satisfactionContribution: 0,
  saturationPenalty: 0,
  factors: [],
};

const initialState: GameUIState = {
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
  reputation: { local: 50, premium: 50, regulatoryPressure: 0 },
  zoom: 1,
  activeEvents: [],
  time: {
    hour: 0,
    day: TIME_SETTINGS.startDay ?? 1,
    month: TIME_SETTINGS.startMonth ?? 1,
    year: TIME_SETTINGS.startYear ?? 1,
    elapsedMs: 0,
  },
  debt: { ...defaultDebtSnapshot },
  security: { score: 0, guardCoverage: 0 },
  guardPresence: { roaming: 0, stationed: 0 },
  timeScale: 1,
  hiredWorkers: [],
  hiredByJob: {},
  economy: defaultEconomySnapshot,
  districts: { zones: [] },
  buildZone: {
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    nextCost: 0,
    expansionsPurchased: 0,
    maxSize: 0,
  },
  activeAssetPacks: [],
  attraction: { ...defaultAttraction },
  workerSchedules: [],
  notifications: [],
  inspectMode: false,
  inspectHover: null,
  buildingStats: { total: 0, roads: 0, byCategory: {} },
  placementHint: null,
  gameOver: false,
  gameOverReason: null,
};

const formatMoney = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameUIState>(initialState);
  const [draggingType, setDraggingType] = useState<BuildingType | null>(null);
  const [saveMetadata, setSaveMetadata] = useState(() => readSavedMetadata());

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      gameRef.current = new Game(gameContainerRef.current, setGameState);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!gameRef.current) return;
      await gameRef.current.whenReady();
      const saved = loadGameSave();
      if (saved && !cancelled) {
        await gameRef.current.loadFromSave(saved);
        setSaveMetadata(readSavedMetadata());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSnapshot = useCallback(async () => {
    if (!gameRef.current) return;
    await gameRef.current.whenReady();
    persistGameSave(gameRef.current.getSavePayload());
    setSaveMetadata(readSavedMetadata());
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      persistSnapshot();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persistSnapshot]);

  const handleSelectBuilding = useCallback(
    (type: BuildingType | null) => {
      if (!gameRef.current || gameState.gameOver) return;
      gameRef.current.setDragMode(type);
      setDraggingType(type);
    },
    [gameState.gameOver]
  );

  const handlePause = useCallback(() => gameRef.current?.setTimeMode('pause'), []);
  const handleResume = useCallback(() => gameRef.current?.setTimeMode('normal'), []);
  const handleFast = useCallback(() => gameRef.current?.setTimeMode('fast'), []);
  const handlePayDebt = useCallback(() => {
    if (!gameRef.current || gameState.gameOver) return;
    gameRef.current.payDebt();
  }, [gameState.gameOver]);

  const handleExpandZone = useCallback(() => {
    if (!gameRef.current || gameState.gameOver) return;
    gameRef.current.expandBuildZone();
  }, [gameState.gameOver]);

  const handleNotificationAction = useCallback(
    (notification: GameNotification) => {
      if (!gameRef.current) return;
      switch (notification.action?.type) {
        case 'focus-building':
          gameRef.current.focusBuilding(notification.action.buildingId);
          break;
        case 'show-debt':
          gameRef.current.pause();
          break;
        default:
          break;
      }
      gameRef.current.acknowledgeNotification(notification.id);
    },
    []
  );

  const handleNotificationDismiss = useCallback((id: string) => {
    gameRef.current?.acknowledgeNotification(id);
  }, []);

  const handleRestart = useCallback(() => {
    clearGameSave();
    window.location.reload();
  }, []);

  const placementHint = useMemo(() => gameState.placementHint, [gameState.placementHint]);
  const outstandingDebt = gameState.debt.isPaidForMonth ? 0 : gameState.debt.paymentDue;

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-slate-950 p-4 text-slate-100">
      <header className="flex flex-col gap-3">
        <V0Hud
          money={gameState.money}
          time={gameState.time}
          debt={gameState.debt}
          isPaused={gameState.isPaused}
          timeScale={gameState.timeScale}
          onPause={handlePause}
          onResume={handleResume}
          onFast={handleFast}
          onPayDebt={handlePayDebt}
        />
        <div className="flex flex-wrap items-center gap-3">
          <BuildZoneIndicator
            buildZone={gameState.buildZone}
            money={gameState.money}
            onExpand={handleExpandZone}
          />
          {placementHint && (
            <div className="rounded-md border border-amber-500/60 bg-amber-900/40 px-3 py-2 text-xs text-amber-100">
              {placementHint}
            </div>
          )}
          {saveMetadata && (
            <div className="ml-auto rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] text-slate-300">
              Sauvegarde auto · {new Date(saveMetadata.timestamp).toLocaleTimeString('fr-FR')}
            </div>
          )}
        </div>
      </header>

      <section className="relative flex flex-1 flex-col gap-3">
        <div
          ref={gameContainerRef}
          className="relative min-h-[640px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
        />
      </section>

      <BuildBar money={gameState.money} selected={draggingType} onSelect={handleSelectBuilding} />

      <div className="flex items-center gap-6 text-sm text-slate-200">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-slate-500">Flux mensuel</span>
          <span className="font-semibold">
            {formatMoney(gameState.economy.monthIncome - gameState.economy.monthExpenses)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-slate-500">Échéance</span>
          <span className="font-semibold">
            {outstandingDebt > 0 ? formatMoney(outstandingDebt) : 'Déjà réglée'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-slate-500">Population</span>
          <span className="font-semibold">
            {gameState.occupantsByRole.visitor + gameState.occupantsByRole.staff} hébergés
          </span>
        </div>
      </div>

      <NotificationCenter
        notifications={gameState.notifications}
        onAction={handleNotificationAction}
        onDismiss={handleNotificationDismiss}
      />

      {gameState.gameOver && (
        <GameOverBanner reason={gameState.gameOverReason} onRestart={handleRestart} />
      )}
    </main>
  );
}
