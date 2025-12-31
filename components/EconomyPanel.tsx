import React, { useMemo } from 'react';
import {
  EconomySnapshot,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  IncomeCategory,
  INCOME_CATEGORIES,
} from '@/pixi/EconomySystem';
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

  const orderedCategories = useMemo<(IncomeCategory | ExpenseCategory)[]>(() => {
    const preferred = [
      ...INCOME_CATEGORIES,
      ...EXPENSE_CATEGORIES.filter(
        (category) => !INCOME_CATEGORIES.includes(category as IncomeCategory)
      ),
    ];
    const present = new Set<IncomeCategory | ExpenseCategory>([
      ...Object.keys(economy.incomeByCategory),
      ...Object.keys(economy.expenseByCategory),
    ] as (IncomeCategory | ExpenseCategory)[]);
    return preferred.filter((cat) => present.has(cat));
  }, [economy.expenseByCategory, economy.incomeByCategory]);

  const categoryLabels: Record<IncomeCategory | ExpenseCategory, string> = {
    operations: 'Exploitation',
    passive: 'Passif (quotidien)',
    events: 'Événements',
    other: 'Divers',
    construction: 'Construction',
    maintenance: 'Maintenance',
    salaries: 'Salaires',
    debt: 'Dette',
    taxes: 'Impôts',
    hiring: 'Recrutement',
    expansion: 'Extension de zone',
  };

  const breakdown = orderedCategories.map((category) => {
    const income = economy.incomeByCategory[category as IncomeCategory] ?? 0;
    const expense = economy.expenseByCategory[category as ExpenseCategory] ?? 0;
    return {
      category,
      label: categoryLabels[category] ?? category,
      income,
      expense,
      net: income - expense,
    };
  });

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
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs uppercase text-slate-400">Projection fin de mois</p>
          <p
            className={`text-lg font-semibold ${
              economy.projection.projectedNet >= 0 ? 'text-emerald-200' : 'text-rose-200'
            }`}
          >
            {formatMoney(economy.projection.projectedNet)}
          </p>
          <div className="mt-1 text-xs text-slate-300">
            <p>
              Moyenne nette : {formatMoney(economy.projection.averageDailyNet)} / jour
            </p>
            <p>
              Jours restants :{' '}
              <span className="font-semibold text-white">{economy.projection.daysRemaining}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-3">
          <p className="text-xs uppercase text-slate-400">Tableau de bord financier</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-md bg-emerald-900/40 px-2 py-1 text-emerald-100">
              Revenus : {formatMoney(economy.monthIncome)}
            </span>
            <span className="rounded-md bg-rose-900/40 px-2 py-1 text-rose-100">
              Dépenses : {formatMoney(economy.monthExpenses)}
            </span>
            <span
              className={`rounded-md px-2 py-1 ${
                netMonthly >= 0
                  ? 'bg-emerald-900/40 text-emerald-100'
                  : 'bg-rose-900/40 text-rose-100'
              }`}
            >
              Solde courant : {formatMoney(netMonthly)}
            </span>
            <span className="rounded-md bg-sky-900/40 px-2 py-1 text-sky-100">
              Projection EOM : {formatMoney(economy.projection.projectedNet)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Projection = solde courant + moyenne quotidienne × jours restants ({economy.projection.daysRemaining} j).
          </p>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-right">Revenus</th>
                <th className="px-3 py-2 text-right">Dépenses</th>
                <th className="px-3 py-2 text-right">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {breakdown.map((row) => (
                <tr key={row.category} className="hover:bg-slate-800/60">
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{row.label}</span>
                      <span className="text-xs text-slate-400 capitalize">{row.category}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-200">
                    {formatMoney(row.income)}
                  </td>
                  <td className="px-3 py-2 text-right text-rose-200">
                    {formatMoney(row.expense)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      row.net >= 0 ? 'text-emerald-200' : 'text-rose-200'
                    }`}
                  >
                    {formatMoney(row.net)}
                  </td>
                </tr>
              ))}
              {breakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-slate-300">
                    Aucune transaction enregistrée ce mois-ci.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-800/60 text-xs uppercase text-slate-300">
              <tr>
                <td className="px-3 py-2 text-left font-semibold text-white">Total</td>
                <td className="px-3 py-2 text-right text-emerald-200">
                  {formatMoney(economy.monthIncome)}
                </td>
                <td className="px-3 py-2 text-right text-rose-200">
                  {formatMoney(economy.monthExpenses)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    netMonthly >= 0 ? 'text-emerald-200' : 'text-rose-200'
                  }`}
                >
                  {formatMoney(netMonthly)}
                </td>
              </tr>
            </tfoot>
          </table>
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
