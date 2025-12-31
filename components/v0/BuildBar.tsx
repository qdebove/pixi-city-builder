import React from 'react';
import { BUILDING_TYPES, BuildingType, calculateIncome } from '@/types/types';

type BuildBarProps = {
  money: number;
  selected: BuildingType | null;
  onSelect: (type: BuildingType | null) => void;
};

const formatMoney = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

const categoryLabels: Record<BuildingType['category'], string> = {
  housing: 'Habitations',
  commerce: 'Commerces',
  industry: 'Industries',
  infrastructure: 'Infrastructures',
};

export const BuildBar: React.FC<BuildBarProps> = ({ money, selected, onSelect }) => {
  const grouped = BUILDING_TYPES.reduce<Record<string, BuildingType[]>>((acc, type) => {
    const key = type.category;
    acc[key] = acc[key] ?? [];
    acc[key].push(type);
    return acc;
  }, {});

  return (
    <div className="w-full rounded-xl border-t border-slate-800 bg-slate-900/90 px-3 py-2 shadow-[0_-6px_20px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Plans disponibles</h2>
        <p className="text-[11px] text-slate-300">Sélectionnez un type puis cliquez sur la carte.</p>
      </div>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        {Object.entries(grouped).map(([category, types]) => (
          <div
            key={category}
            className="min-w-[240px] flex-shrink-0 rounded-lg border border-slate-800 bg-slate-950/60 p-2"
          >
            <div className="mb-2 flex items-center justify-between text-xs text-slate-200">
              <span className="font-semibold">{categoryLabels[category as BuildingType['category']]}</span>
              <span className="text-[11px] text-slate-400">{types.length} plan(s)</span>
            </div>
            <div className="flex flex-col gap-2">
              {types
                .sort((a, b) => a.cost - b.cost)
                .map((type) => {
                  const isActive = selected?.id === type.id;
                  const canAfford = money >= type.cost;
                  const income = calculateIncome(type, 1);
                  const intervalSec =
                    type.baseIntervalMs > 0 ? (type.baseIntervalMs / 1000).toFixed(1) : '—';

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => onSelect(isActive ? null : type)}
                      disabled={!canAfford}
                      className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition ${
                        isActive
                          ? 'border-sky-500 bg-sky-900/40 text-white'
                          : canAfford
                          ? 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-sky-500'
                          : 'cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{type.name}</span>
                        <span className="text-[11px] text-slate-300">
                          Coût {formatMoney(type.cost)}
                        </span>
                        {!type.isRoad && (
                          <span className="text-[11px] text-slate-400">
                            Gain {formatMoney(income)} / {intervalSec}s
                          </span>
                        )}
                      </div>
                      <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200">
                        {type.isRoad ? 'Route' : 'Bâtiment'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
