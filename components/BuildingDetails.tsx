import {
  BuildingState,
  BuildingType,
  calculateAutoClickerUpgradeCost,
  calculateIncome,
  calculateUpgradeCost,
} from '@/types/types';
import React from 'react';

interface DetailsProps {
  type: BuildingType;
  state: BuildingState;
  money: number;
  onUpgrade: () => void;
  onToggleAutoClicker: () => void;
  onUpgradeAutoClicker: () => void;
}

export const BuildingDetails: React.FC<DetailsProps> = ({
  type,
  state,
  money,
  onUpgrade,
  onToggleAutoClicker,
  onUpgradeAutoClicker,
}) => {
  const currentIncome = calculateIncome(type, state.level);
  const upgradeCost = calculateUpgradeCost(type, state.level);
  const isMaxLevel = state.level >= type.maxLevel;
  const canAffordUpgrade = money >= upgradeCost;

  const hasAutoClicker = state.isAutoClickerUnlocked;
  const canUnlockByLevel = state.level >= type.autoClickerUnlockLevel;
  const isAutoMax = state.autoClickerLevel >= type.autoClickerMaxLevel;

  const autoClickerCost = calculateAutoClickerUpgradeCost(
    type,
    state.autoClickerLevel
  );
  const canAffordAutoClicker = money >= autoClickerCost;
  const autoClickerSpeed =
    state.isAutoClickerUnlocked && state.autoClickerInterval > 0
      ? (1000 / state.autoClickerInterval).toFixed(1)
      : '0';

  return (
    <div className="p-4 bg-slate-700/50 rounded-lg shadow-inner mt-4 border border-slate-600">
      <h3 className="text-lg font-bold text-sky-300 mb-3">
        {type.name} (Niv. {state.level})
      </h3>

      <div className="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-4">
        <p>
          ❤️ Vie :{' '}
          <span className="font-mono text-green-400">
            {state.currentHealth} / {type.baseHealth}
          </span>
        </p>
        <p>
          👤 Pers. :{' '}
          <span className="font-mono">
            {state.currentOccupants} / {type.capacity}
          </span>
        </p>
        <p>
          💰 Gain/Clic :{' '}
          <span className="font-mono text-amber-400">{currentIncome}€</span>
        </p>
        <p>
          📈 Max Niv. : <span className="font-mono">{type.maxLevel}</span>
        </p>
      </div>

      {!type.isRoad && (
        <>
          <div className="mb-4">
            <button
              onClick={onUpgrade}
              disabled={isMaxLevel || !canAffordUpgrade}
              className={`w-full py-2 rounded font-semibold transition ${
                isMaxLevel
                  ? 'bg-gray-600 cursor-not-allowed'
                  : canAffordUpgrade
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-red-900/50 text-red-300 cursor-not-allowed'
              }`}
            >
              {isMaxLevel
                ? 'Niveau Max'
                : `Monter Niveau ${state.level + 1} (${upgradeCost}€)`}
            </button>
          </div>

          <h4 className="text-sm font-semibold text-slate-400 border-t border-slate-600 pt-3 mt-3 mb-2">
            Auto-Clic
          </h4>

          <div className="space-y-2">
            <button
              onClick={onToggleAutoClicker}
              disabled={
                (!hasAutoClicker &&
                  (!canUnlockByLevel || !canAffordAutoClicker)) ||
                (hasAutoClicker && false)
              }
              className={`w-full py-2 rounded transition ${
                !hasAutoClicker
                  ? canUnlockByLevel && canAffordAutoClicker
                    ? 'bg-sky-600 hover:bg-sky-500'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : state.isAutoClickerActive
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              {!hasAutoClicker
                ? canUnlockByLevel
                  ? `Acheter Auto-Clic (Niv. 1 – ${autoClickerCost}€)`
                  : `Débloquer au Niveau ${type.autoClickerUnlockLevel}`
                : state.isAutoClickerActive
                ? `Désactiver Auto-Clic (Niv. ${state.autoClickerLevel}, ${autoClickerSpeed}/s)`
                : `Activer Auto-Clic (Niv. ${state.autoClickerLevel}, ${autoClickerSpeed}/s)`}
            </button>

            {hasAutoClicker && (
              <button
                onClick={onUpgradeAutoClicker}
                disabled={isAutoMax || !canAffordAutoClicker}
                className={`w-full py-2 rounded transition text-sm ${
                  isAutoMax
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : canAffordAutoClicker
                    ? 'bg-purple-600 hover:bg-purple-500'
                    : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isAutoMax
                  ? `Vitesse max atteinte (Niv. ${state.autoClickerLevel})`
                  : `Améliorer Vitesse (vers Niv. ${
                      state.autoClickerLevel + 1
                    }) – ${autoClickerCost}€`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
