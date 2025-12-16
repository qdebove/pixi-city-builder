import { InfoImageSlot } from './InfoImageSlot';
import {
  BuildingState,
  BuildingType,
  calculateIncome,
  calculateUpgradeCost,
} from '@/types/types';
import { SelectedBuildingComputed } from '@/pixi/Game';
import { TIME_SETTINGS } from '@/pixi/data/time-settings';
import React from 'react';

interface DetailsProps {
  type: BuildingType;
  state: BuildingState;
  computed?: SelectedBuildingComputed | null;
  money: number;
  onUpgrade: () => void;
}

export const BuildingDetails: React.FC<DetailsProps> = ({
  type,
  state,
  computed,
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
  const roadLabel = type.isRoad
    ? 'Infrastructure'
    : type.requiresRoadAccess === false
    ? 'Autonome (hors route)'
    : 'Doit toucher une route';

  const ratio =
    type.capacity > 0
      ? Math.min(1, state.occupants.visitor / type.capacity)
      : 0;
  const staffRatio =
    staffCapacity > 0
      ? Math.min(1, staffCount / staffCapacity)
      : 0;
  const computedIncomePerTick = computed?.incomePerTick ?? null;
  const occupancyMultiplier = (1 + ratio) * (1 + staffRatio * type.staffEfficiency);
  const incomeWithOccupancy = Math.floor(baseIncome * occupancyMultiplier);
  const currentTickIncome = computedIncomePerTick ?? incomeWithOccupancy;
  const occupancyDelta = incomeWithOccupancy - baseIncome;
  const passiveDelta = currentTickIncome - incomeWithOccupancy;
  const eventMultiplier = computed?.eventMultiplier ?? 1;
  const incomeWithEvents =
    computed?.incomeWithEvents ??
    Math.floor(currentTickIncome * Math.max(0, eventMultiplier));
  const districtName = computed?.districtName ?? 'Hors district';
  const districtMultiplier = computed?.districtIncomeMultiplier ?? 1;
  const dailyPassive = Math.floor(
    (type.dailyPassiveIncome ?? 0) * occupancyMultiplier * Math.max(1, districtMultiplier)
  );

  const formatSignedAmount = (amount: number) =>
    `${amount >= 0 ? '+' : '-'}${Math.abs(amount)}€ / tick`;

  const effectiveIntervalMs = computed?.intervalMs ?? state.productionIntervalMs;
  const ticksPerSecond =
    effectiveIntervalMs > 0 ? 1000 / effectiveIntervalMs : 0;
  const intervalSec = effectiveIntervalMs > 0 ? effectiveIntervalMs / 1000 : 0;
  const msPerDay = TIME_SETTINGS.msPerHour * TIME_SETTINGS.hoursPerDay;
  const incomePerDay =
    effectiveIntervalMs > 0
      ? Math.floor((incomeWithEvents * msPerDay) / effectiveIntervalMs)
      : 0;
  const projectedDaily = incomePerDay + dailyPassive;
  const projectedMonthly = projectedDaily * TIME_SETTINGS.daysPerMonth;
  const maintenancePerDay = type.maintenancePerDay ?? 0;
  const maintenancePerMonth = maintenancePerDay * TIME_SETTINGS.daysPerMonth;

  return (
    <div className="p-4 bg-slate-700/90 rounded-lg shadow-xl border border-slate-600">
      <div className="mb-3 flex items-start gap-3">
        <InfoImageSlot
          label={type.name}
          accentColor={accentColor}
          showPreviewOnHover
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
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                type.requiresRoadAccess === false
                  ? 'bg-emerald-900/40 text-emerald-100 border border-emerald-700/70'
                  : 'bg-amber-900/40 text-amber-100 border border-amber-700/70'
              }`}
            >
              {roadLabel}
            </span>
            {type.requiresRoadAccess !== false && !type.isRoad && (
              <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-100">
                Adjacence route obligatoire
              </span>
            )}
            <span className="rounded-full bg-sky-900/40 px-2 py-1 text-[11px] font-semibold text-sky-100 border border-sky-700/60">
              District : {districtName} ({(districtMultiplier * 100).toFixed(0)}% revenus)
            </span>
          </div>
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
              {incomeWithEvents}€ / tick
            </span>
            {eventMultiplier !== 1 && (
              <span className="rounded px-1.5 py-0.5 text-[11px] bg-indigo-500/20 text-indigo-100 border border-indigo-400/50">
                Événements x{eventMultiplier.toFixed(2)}
              </span>
            )}
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
              <p className="flex justify-between">
                <span>Occupation</span>
                <span className="font-mono text-emerald-200">
                  {formatSignedAmount(occupancyDelta)}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Passifs & compétences</span>
                <span className="font-mono text-emerald-200">
                  {formatSignedAmount(passiveDelta)}
                </span>
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
              {eventMultiplier !== 1 && (
                <p className="flex justify-between text-indigo-200">
                  <span>Modificateur évènement</span>
                  <span className="font-mono">x{eventMultiplier.toFixed(2)}</span>
                </p>
              )}
              <div className="mt-2 border-t border-slate-700 pt-1 space-y-1">
                <p className="flex justify-between text-slate-200">
                  <span>Revenus ponctuels</span>
                  <span className="font-mono">{incomeWithEvents}€ / tick</span>
                </p>
                <p className="flex justify-between text-slate-200">
                  <span>Passif journalier</span>
                  <span className="font-mono">{dailyPassive}€</span>
                </p>
                <p className="flex justify-between text-emerald-200">
                  <span>Journée (total)</span>
                  <span className="font-mono">{projectedDaily}€ / jour</span>
                </p>
                <p className="flex justify-between text-slate-100">
                  <span>Projection mensuelle</span>
                  <span className="font-mono">{projectedMonthly}€ / mois</span>
                </p>
                <p className="flex justify-between text-amber-200">
                  <span>Entretien mensuel</span>
                  <span className="font-mono">-{maintenancePerMonth}€</span>
                </p>
              </div>
              <div className="mt-1 border-t border-slate-700 pt-1 flex justify-between">
                <span>Total actuel</span>
                <span className="font-mono text-amber-300">
                  {incomeWithEvents}€ / tick
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
