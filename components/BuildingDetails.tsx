import { InfoImageSlot } from './InfoImageSlot';
import { BuildingState, BuildingType, calculateIncome, calculateUpgradeCost } from '@/types/types';
import React from 'react';

interface DetailsProps {
  type: BuildingType;
  state: BuildingState;
  money: number;
  onUpgrade: () => void;
}

export const BuildingDetails: React.FC<DetailsProps> = ({
  type,
  state,
  money,
  onUpgrade,
}) => {
  const baseIncome = calculateIncome(type, state.level);
  const upgradeCost = calculateUpgradeCost(type, state.level);
  const isMaxLevel = state.level >= type.maxLevel;
  const canAffordUpgrade = money >= upgradeCost;

  const visitorCount = state.occupants.visitor || 0;
  const staffCount = state.occupants.staff || 0;
  const staffCapacity = type.staffCapacity;
  const accentColor = `#${type.color.toString(16).padStart(6, '0')}`;

  const ratio =
    type.capacity > 0
      ? Math.min(1, state.occupants.visitor / type.capacity)
      : 0;
  const staffRatio =
    staffCapacity > 0
      ? Math.min(1, staffCount / staffCapacity)
      : 0;
  const currentTickIncome = Math.floor(
    baseIncome * (1 + ratio) * (1 + staffRatio * type.staffEfficiency)
  );

  const ticksPerSecond =
    state.productionIntervalMs > 0
      ? 1000 / state.productionIntervalMs
      : 0;
  const intervalSec =
    state.productionIntervalMs > 0
      ? state.productionIntervalMs / 1000
      : 0;

  return (
    <div className="p-4 bg-slate-700/90 rounded-lg shadow-xl border border-slate-600">
      <div className="mb-3 flex items-start gap-3">
        <InfoImageSlot
          label={type.name}
          accentColor={accentColor}
        />
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-sky-300">
            {type.name} (Niv. {state.level})
          </h3>
          <p className="text-[12px] text-slate-200 leading-snug">
            Synthèse opérationnelle avec zone d&apos;image dédiée. L&apos;illustration reste
            prête à être grisée/floutée si la fiche est verrouillée par une future
            condition de déblocage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-4">
        <p>
          ❤️ Vie :{' '}
          <span className="font-mono text-green-400">
            {state.currentHealth} / {type.baseHealth}
          </span>
        </p>
        <p>
          👤 Occupants :{' '}
          <span className="font-mono">
            {visitorCount} / {type.capacity}
          </span>
        </p>
        <p className="text-[12px] text-slate-400 col-span-2 flex gap-4">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-pink-300" />
            Visiteurs :
            <span className="font-mono text-slate-100">{visitorCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-sky-300" />
            Personnel :
            <span className="font-mono text-slate-100">
              {staffCount} / {staffCapacity}
            </span>
          </span>
        </p>

        {/* Prod actuelle + tooltip custom joli */}
        <div className="col-span-2">
          <div className="relative inline-flex items-center gap-1 group cursor-help">
            <span>💰 Prod actuelle :</span>
            <span className="font-mono text-amber-400">
              {currentTickIncome}€ / tick
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-200">
              ?
            </span>

            {/* Tooltip */}
            <div className="pointer-events-none absolute left-0 top-full mt-1 w-64 rounded-md bg-slate-900/95 border border-slate-600 px-3 py-2 text-[11px] text-slate-100 shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition">
              <p className="font-semibold text-amber-300 mb-1">
                Détails de la production
              </p>
              <p className="flex justify-between">
                <span>Base</span>
                <span className="font-mono">{baseIncome}€ / tick</span>
              </p>
              {type.capacity > 0 && (
                <p className="flex justify-between">
                  <span>Occupants</span>
                  <span className="font-mono">
                    {visitorCount} / {type.capacity}
                  </span>
                </p>
              )}
              {staffCapacity > 0 && (
                <p className="flex justify-between">
                  <span>Personnel</span>
                  <span className="font-mono">
                    {staffCount} / {staffCapacity}
                  </span>
                </p>
              )}
              <div className="mt-1 border-t border-slate-700 pt-1 flex justify-between">
                <span>Total actuel</span>
                <span className="font-mono text-amber-300">
                  {currentTickIncome}€ / tick
                </span>
              </div>
            </div>
          </div>
        </div>

        <p>
          ⚙️ Vitesse :{' '}
          <span className="font-mono">
            {ticksPerSecond.toFixed(2)} ticks/s ({intervalSec.toFixed(2)}s)
          </span>
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
                : `Améliorer au Niv. ${
                    state.level + 1
                  } (${upgradeCost}€)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
