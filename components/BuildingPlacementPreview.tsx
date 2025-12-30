import { BuildingType } from '@/types/types';
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
  const canAfford = money >= type.cost;
  const monthlyMaintenance = Math.max(
    0,
    Math.round((type.maintenancePerDay ?? 0) * daysPerMonth)
  );

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

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <StatCard
          label="Coût initial"
          value={formatMoney(type.cost)}
          helper={`Trésorerie : ${formatMoney(money)}`}
          highlight={canAfford ? 'normal' : 'alert'}
        />
        <StatCard
          label="Maintenance mensuelle"
          value={formatMoney(monthlyMaintenance)}
          helper={`${formatMoney(type.maintenancePerDay ?? 0)} / jour`}
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
      </div>
    </div>
  );
};
