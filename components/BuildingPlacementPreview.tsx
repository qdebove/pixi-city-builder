import { BuildingType } from '@/types/types';
import { WORKER_ROSTER } from '@/pixi/data/game-model';
import React from 'react';

type PreviewProps = {
  type: BuildingType;
  money: number;
  daysPerMonth: number;
};

const formatMoney = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  highlight?: 'alert' | 'normal';
};

const StatCard: React.FC<StatCardProps> = ({ label, value, helper, highlight }) => (
  <div
    className={`rounded-lg border px-3 py-2 ${
      highlight === 'alert'
        ? 'border-rose-500/70 bg-rose-900/30 text-rose-100'
        : 'border-slate-700/80 bg-slate-900/70 text-slate-100'
    }`}
  >
    <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
    {helper && <p className="text-[11px] text-slate-400">{helper}</p>}
  </div>
);

export const BuildingPlacementPreview: React.FC<PreviewProps> = ({
  type,
  money,
  daysPerMonth,
}) => {
  const averageSalaryPerDay =
    WORKER_ROSTER.length > 0
      ? WORKER_ROSTER.reduce((sum, worker) => sum + (worker.salaryPerDay ?? 0), 0) /
        WORKER_ROSTER.length
      : 0;

  const canAfford = money >= type.cost;
  const monthlyMaintenance = Math.max(
    0,
    Math.round((type.maintenancePerDay ?? 0) * daysPerMonth)
  );
  const monthlyStaffCost = Math.round(type.staffCapacity * averageSalaryPerDay * daysPerMonth);
  const totalMonthlyCost = monthlyMaintenance + monthlyStaffCost;
  const cyclesPerDay =
    type.baseIntervalMs > 0 ? Math.floor((24 * 60 * 60 * 1000) / type.baseIntervalMs) : 0;
  const activeIncomePerDay = cyclesPerDay * type.baseIncome;
  const passiveIncomePerDay = Math.max(0, type.dailyPassiveIncome ?? 0);
  const estimatedMonthlyIncome =
    type.isRoad ? 0 : Math.round((activeIncomePerDay + passiveIncomePerDay) * daysPerMonth);
  const netMonthlyImpact = estimatedMonthlyIncome - totalMonthlyCost;
  const coverageRatio =
    totalMonthlyCost > 0 ? Math.min(1, Math.max(0, estimatedMonthlyIncome / totalMonthlyCost)) : 1;
  const impactTone =
    netMonthlyImpact >= 0
      ? 'text-emerald-200'
      : netMonthlyImpact > -totalMonthlyCost
      ? 'text-amber-200'
      : 'text-rose-200';

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-2xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="text-[11px] uppercase text-slate-400">Prévisualisation placement</p>
          <p className="text-lg font-semibold text-white">{type.name}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
            canAfford
              ? 'border border-emerald-500/60 bg-emerald-900/40 text-emerald-100'
              : 'border border-rose-500/60 bg-rose-900/40 text-rose-100'
          }`}
        >
          {canAfford ? 'Fonds disponibles' : 'Fonds insuffisants'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Coût initial"
          value={formatMoney(type.cost)}
          helper={`Trésorerie : ${formatMoney(money)}`}
          highlight={canAfford ? 'normal' : 'alert'}
        />
        <StatCard
          label="Coût mensuel"
          value={formatMoney(totalMonthlyCost)}
          helper={`Maintenance ${formatMoney(monthlyMaintenance)} + personnel ${formatMoney(monthlyStaffCost)}`}
          highlight={totalMonthlyCost > 0 ? 'normal' : 'alert'}
        />
        <StatCard
          label="Personnel requis"
          value={
            type.staffCapacity > 0
              ? `${type.staffCapacity} poste${type.staffCapacity > 1 ? 's' : ''}`
              : 'Aucun poste dédié'
          }
          helper={
            type.capacity > 0
              ? `${type.capacity} visiteurs simultanés`
              : type.isRoad
              ? 'Infrastructure de circulation'
              : 'Support'
          }
        />
        <StatCard
          label="Revenu estimé"
          value={formatMoney(estimatedMonthlyIncome)}
          helper={
            type.isRoad
              ? 'Pas de revenus directs'
              : `${formatMoney(activeIncomePerDay)} / jour (cycle + passif)`
          }
        />
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/80 p-3">
        <div className="flex items-center justify-between text-sm font-semibold text-white">
          <span>Impact sur flux mensuel</span>
          <span className={impactTone}>{formatMoney(netMonthlyImpact)} / mois</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full ${netMonthlyImpact >= 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.round(coverageRatio * 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Estimation basée sur cadence ({cyclesPerDay} cycles/jour) et revenus passifs. Ajustez le
          staff pour limiter la saturation.
        </p>
      </div>
    </div>
  );
};
