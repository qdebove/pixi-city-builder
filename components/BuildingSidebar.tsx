import {
  BUILDING_TYPES,
  BuildingType,
  calculateIncome,
} from '@/types/types';
import React, { useMemo, useState } from 'react';
import { MenuTab } from './MainMenuOverlay';

interface SidebarProps {
  money: number;
  totalClicks: number;
  onSelect: (type: BuildingType | null) => void;
  draggingMode: BuildingType | null;
  onOpenMenu: (tab: MenuTab) => void;
}

const CATEGORY_LABELS: Record<BuildingType['category'], string> = {
  housing: 'Habitations',
  commerce: 'Commerces',
  industry: 'Industries',
  infrastructure: 'Infrastructures',
};

export const BuildingSidebar: React.FC<SidebarProps> = ({
  money,
  totalClicks,
  onSelect,
  draggingMode,
  onOpenMenu,
}) => {
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);

  const grouped = useMemo(
    () =>
      Array.from(new Set(BUILDING_TYPES.map((t) => t.category)))
        .map((cat) => {
          const items = BUILDING_TYPES
            .filter((t) => t.category === cat)
            .filter((type) => (showAffordableOnly ? money >= type.cost : true))
            .sort((a, b) => a.cost - b.cost);

          return {
            id: cat,
            label: CATEGORY_LABELS[cat],
            items,
          };
        })
        .filter((group) => group.items.length > 0),
    [money, showAffordableOnly]
  );

  return (
    <aside className="w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 shadow-[0_-6px_20px_rgba(0,0,0,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">Production</span>
            <span className="font-mono text-amber-300 text-xs">
              {totalClicks.toLocaleString()} ticks
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">Catalogue</span>
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => onOpenMenu('buildings')}
                className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 font-semibold text-white hover:border-sky-500 hover:text-sky-100"
              >
                Bibliothèque
              </button>
              <button
                type="button"
                onClick={() => onOpenMenu('skills')}
                className="rounded-md border border-violet-700 bg-violet-800 px-2 py-1 font-semibold text-white hover:border-violet-500"
              >
                Compétences
              </button>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-[11px] text-slate-200">
          <input
            type="checkbox"
            className="accent-sky-500"
            checked={showAffordableOnly}
            onChange={(e) => setShowAffordableOnly(e.target.checked)}
          />
          Abordables uniquement
        </label>
      </div>

      <div className="mt-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
        <div className="flex min-w-full gap-3 px-4 pb-1">
          {grouped.map((group) => (
            <div
              key={group.id}
              className="min-w-[280px] flex-shrink-0 rounded-xl border border-slate-700 bg-slate-800/80"
            >
              <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
                <span className="text-[12px] font-semibold uppercase text-slate-200">
                  {group.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  {group.items.length} plans
                </span>
              </div>

              <div className="flex flex-col gap-2 p-2">
                {group.items.map((type) => {
                  const isDisabled = money < type.cost;
                  const isActive = draggingMode?.id === type.id;
                  const handleClick = () => {
                    if (isDisabled) return;
                    onSelect(isActive ? null : type);
                  };

                  const baseGain = calculateIncome(type, 1);
                  const periodSec =
                    type.baseIntervalMs > 0
                      ? (type.baseIntervalMs / 1000).toFixed(2)
                      : null;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={handleClick}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-2 py-2 text-left transition duration-150 ${
                        isDisabled
                          ? 'cursor-not-allowed border-slate-800/70 bg-slate-900/60 text-slate-500'
                          : 'border-slate-700 bg-slate-900/70 hover:border-sky-500 hover:bg-slate-800/80'
                      } ${isActive ? 'ring-2 ring-sky-400 bg-sky-900/30' : ''}`}
                      disabled={isDisabled}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-md border border-slate-700"
                          style={{
                            backgroundColor: `#${type.color.toString(16).padStart(6, '0')}`,
                          }}
                        />
                        <div className="flex flex-col text-xs">
                          <span className="text-sm font-semibold text-white">{type.name}</span>
                          <span className="text-[11px] text-slate-300">
                            Coût : {type.cost}€
                            {!type.isRoad && periodSec && (
                              <>
                                {' '}
                                • Gain {baseGain}€ / {periodSec}s
                              </>
                            )}
                          </span>
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <span
                              className={`rounded-full px-2 py-0.5 font-semibold ${
                                type.requiresRoadAccess === false
                                  ? 'bg-emerald-900/50 text-emerald-100 border border-emerald-700/70'
                                  : 'bg-amber-900/40 text-amber-100 border border-amber-700/70'
                              }`}
                            >
                              {type.isRoad
                                ? 'Pose de route'
                                : type.requiresRoadAccess === false
                                ? 'Autonome (hors route)'
                                : 'Accès route requis'}
                            </span>
                            {type.requiresRoadAccess !== false && !type.isRoad && (
                              <span className="rounded-full bg-slate-900/60 px-2 py-0.5 font-semibold text-slate-200">
                                Adjacent à une route
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200">
                        {type.isRoad ? 'Route' : 'Exploitable'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-200">Contrôles</span> : 🖱️ Gauche = Poser / Sélectionner • 🖱️ Droit = Annuler / Caméra • 🔍 Molette = Zoom
      </div>
    </aside>
  );
};
