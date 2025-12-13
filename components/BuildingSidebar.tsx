import {
  BUILDING_TYPES,
  BuildingType,
  calculateIncome,
} from '@/types/types';
import React, { useState } from 'react';
import { MenuTab } from './MainMenuOverlay';

interface SidebarProps {
  money: number;
  totalClicks: number;
  onSelect: (type: BuildingType | null) => void;
  draggingMode: BuildingType | null;
  onOpenMenu: (tab: MenuTab) => void;
}

const CATEGORY_LABELS: Record<
  BuildingType['category'],
  string
> = {
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
}) => {
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);

  const categories = Array.from(
    new Set(BUILDING_TYPES.map((t) => t.category))
  );

  const grouped = categories.map((cat) => ({
    id: cat,
    label: CATEGORY_LABELS[cat],
    items: BUILDING_TYPES
      .filter((t) => t.category === cat)
      .sort((a, b) => a.cost - b.cost),
  }));

  return (
    <aside className="w-full shrink-0 bg-slate-800 flex flex-col">
      <h1 className="text-xl font-bold text-sky-400 uppercase tracking-wider mb-2">
        Mini City Tycoon
      </h1>

      <div className="text-xs text-slate-400 mb-3">
        Ticks de production :{' '}
        <span className="font-mono text-amber-400">
          {totalClicks.toLocaleString()}
        </span>
      </div>

      <label className="flex items-center gap-2 text-xs mb-4">
        <input
          type="checkbox"
          className="accent-sky-500"
          checked={showAffordableOnly}
          onChange={(e) => setShowAffordableOnly(e.target.checked)}
        />
        Afficher uniquement les bâtiments abordables
      </label>

      <h2 className="text-sm text-slate-400 uppercase font-semibold border-b border-slate-700 pb-1 mb-3">
        Constructions
      </h2>

      <div className="flex flex-col gap-2">
        {grouped.map((group) => {
          if (group.items.length === 0) return null;

          return (
            <details
              key={group.id}
              className="bg-slate-900/60 border border-slate-700 rounded-lg"
              open
            >
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>{group.label}</span>
              </summary>

              <div className="px-3 pb-2 pt-1 flex flex-col gap-2">
                {group.items
                  .filter((type) =>
                    showAffordableOnly ? money >= type.cost : true
                  )
                  .map((type) => {
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
                      <div
                        key={type.id}
                        className={`
                          flex items-center p-2 rounded-lg cursor-pointer transition duration-150 ease-in-out 
                          ${
                            isDisabled
                              ? 'opacity-50 grayscale cursor-not-allowed'
                              : 'bg-slate-700 hover:bg-slate-600'
                          }
                          ${
                            isActive
                              ? 'ring-2 ring-sky-400 bg-sky-900/40'
                              : ''
                          }
                        `}
                        onClick={handleClick}
                      >
                        <div
                          className="w-7 h-7 rounded mr-3 shrink-0"
                          style={{
                            backgroundColor: `#${type.color
                              .toString(16)
                              .padStart(6, '0')}`,
                          }}
                        ></div>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-sm">
                            {type.name}
                          </span>
                          <span className="text-slate-300">
                            Coût : {type.cost}€
                            {!type.isRoad && periodSec && (
                              <>
                                {' '}
                                | Gain base : {baseGain}€ / tick •{' '}
                                {periodSec}s
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-700 pt-3">
        <p className="text-xs text-slate-300">
          Les arbres de compétences et la bibliothèque de bâtiments sont désormais
          regroupés dans le menu principal pour rester lisibles sur mobile.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => onOpenMenu('buildings')}
            className="rounded-lg bg-slate-700 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-600"
          >
            Ouvrir la bibliothèque
          </button>
          <button
            onClick={() => onOpenMenu('skills')}
            className="rounded-lg bg-indigo-700 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600"
          >
            Arbres de compétences
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4 text-xs text-slate-500 border-t border-slate-700">
        <strong>Contrôles :</strong>
        <br />
        🖱️ Clic Gauche : Poser / Sélectionner
        <br />
        🖱️ Clic Droit : Annuler / Déplacer caméra
        <br />
        🔍 Molette : Zoomer / Dézoomer
      </div>
    </aside>
  );
};
