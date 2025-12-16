import React from 'react';
import { EconomySnapshot } from '@/pixi/EconomySystem';
import { DistrictSnapshot } from '@/pixi/DistrictSystem';

interface EconomyPanelProps {
  economy: EconomySnapshot;
  districts: DistrictSnapshot;
}

const formatMoney = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

export const EconomyPanel: React.FC<EconomyPanelProps> = ({ economy, districts }) => {
  const netMonthly = economy.monthIncome - economy.monthExpenses;
  const netDaily =
    economy.dailyPassiveIncome -
    (economy.dailyMaintenance + economy.dailySalaries);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-sky-100">Économie multi-niveaux</h3>
        <p className="text-sm text-slate-300">
          Suivi des coûts d’entretien, salaires, taxes et bonus de districts pour anticiper la trésorerie.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs uppercase text-slate-400">Revenus quotidiens</p>
          <p className="text-lg font-semibold text-emerald-200">
            {formatMoney(economy.dailyPassiveIncome)} / jour
          </p>
          <div className="mt-1 text-xs text-slate-300">
            <p>Dernier versement : {formatMoney(economy.lastDailyIncome)}</p>
            <p className={netDaily >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              Net après charges : {formatMoney(netDaily)} / jour
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs uppercase text-slate-400">Charges quotidiennes</p>
          <p className="text-lg font-semibold text-amber-200">
            {formatMoney(economy.dailyMaintenance + economy.dailySalaries)} / jour
          </p>
          <div className="mt-1 text-xs text-slate-300">
            <p>Entretien : {formatMoney(economy.dailyMaintenance)}</p>
            <p>Salaires : {formatMoney(economy.dailySalaries)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs uppercase text-slate-400">Projection fiscale</p>
          <p className="text-lg font-semibold text-emerald-200">
            {formatMoney(economy.projectedTax)} / mois
          </p>
          <div className="mt-1 text-xs text-slate-300">
            <p>Dernier prélèvement : {formatMoney(economy.lastMonthlyTax)}</p>
            <p>Bénéfice courant : {formatMoney(netMonthly)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs uppercase text-slate-400">Flux du mois</p>
          <p className="text-lg font-semibold text-sky-200">
            {formatMoney(economy.monthIncome)} revenus
          </p>
          <div className="mt-1 text-xs text-slate-300">
            <p>Dépenses : {formatMoney(economy.monthExpenses)}</p>
            <p className={netMonthly >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              Net estimé : {formatMoney(netMonthly)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-400">Districts thématiques</p>
            <h4 className="text-base font-semibold text-white">Bonus contextuels</h4>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          {districts.zones.map((zone) => (
            <div
              key={zone.id}
              className="rounded-lg border border-slate-700/80 bg-slate-800/80 p-2"
            >
              <p className="text-sm font-semibold text-slate-100">{zone.name}</p>
              <p className="text-xs text-slate-300">Thème : {zone.theme}</p>
              <p className="text-xs text-slate-400">Bâtiments : {zone.buildings}</p>
            </div>
          ))}
          {districts.zones.length === 0 && (
            <p className="text-sm text-slate-300">Aucune zone thématique définie.</p>
          )}
        </div>
      </div>
    </div>
  );
};
