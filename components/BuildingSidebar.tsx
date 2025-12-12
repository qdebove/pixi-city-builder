import { BUILDING_TYPES, BuildingType, calculateIncome } from '@/types/types';
import React from 'react';

interface SidebarProps {
  money: number;
  totalClicks: number;
  onSelect: (type: BuildingType | null) => void;
  draggingMode: BuildingType | null;
}

export const BuildingSidebar: React.FC<SidebarProps> = ({
  money,
  totalClicks,
  onSelect,
  draggingMode,
}) => {
  return (
    <aside
      id="sidebar"
      className="w-full shrink-0 bg-slate-800 flex flex-col"
    >
      <h1 className="text-xl font-bold text-sky-400 uppercase tracking-wider mb-4">
        Mini City Tycoon
      </h1>

      {/* Stats Panel */}
      <div className="bg-slate-900 p-4 rounded-lg mb-6 border border-slate-700">
        <div className="flex justify-between mb-2 text-sm">
          <span>Banque :</span>
          <span className="font-mono font-bold text-amber-400">
            {money.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Clics Totaux :</span>
          <span className="font-mono font-bold text-amber-400">
            {totalClicks.toLocaleString()}
          </span>
        </div>
      </div>

      <h2 className="text-sm text-slate-400 uppercase font-semibold border-b border-slate-700 pb-1 mb-3">
        Constructions
      </h2>

      <div className="flex flex-col space-y-3">
        {BUILDING_TYPES.map((type) => {
          const isDisabled = money < type.cost;
          const isActive = draggingMode?.id === type.id;

          const handleClick = () => {
            if (isDisabled) return;
            onSelect(isActive ? null : type);
          };

          const baseGain = calculateIncome(type, 1); // gain au niveau 1

          return (
            <div
              key={type.id}
              className={`
                flex items-center p-3 rounded-lg cursor-pointer transition duration-150 ease-in-out 
                ${
                  isDisabled
                    ? 'opacity-50 grayscale cursor-not-allowed'
                    : 'bg-slate-700 hover:bg-slate-600'
                }
                ${isActive ? 'ring-2 ring-sky-400 bg-sky-900/40' : ''}
              `}
              onClick={handleClick}
            >
              <div
                className="w-8 h-8 rounded mr-3 shrink-0"
                style={{
                  backgroundColor: `#${type.color
                    .toString(16)
                    .padStart(6, '0')}`,
                }}
              ></div>
              <div className="flex flex-col text-sm">
                <span className="font-semibold">{type.name}</span>
                <span className="text-xs text-slate-300">
                  Coût: {type.cost}€{' '}
                  {!type.isRoad && (
                    <>| Gain Niv.1: {baseGain}€ / clic</>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-6 text-xs text-slate-500 border-t border-slate-700">
        <strong>Contrôles :</strong>
        <br />
        🖱️ Clic Gauche : Poser / Récolter
        <br />
        🖱️ Clic Droit : Annuler mode construction / Déplacer caméra
        <br />
        🔍 Molette : Zoomer / Dézoomer
      </div>
    </aside>
  );
};
