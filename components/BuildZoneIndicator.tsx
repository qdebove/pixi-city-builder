import React from 'react';
import { BuildZoneSnapshot } from '@/pixi/BuildZoneSystem';

interface BuildZoneIndicatorProps {
  buildZone: BuildZoneSnapshot;
  money: number;
  onExpand: () => void;
}

export const BuildZoneIndicator: React.FC<BuildZoneIndicatorProps> = ({
  buildZone,
  money,
  onExpand,
}) => {
  const sizeLabel = `${buildZone.bounds.width} x ${buildZone.bounds.height}`;
  const isMaxed =
    buildZone.bounds.width >= buildZone.maxSize ||
    buildZone.bounds.height >= buildZone.maxSize;
  const canAfford = money >= buildZone.nextCost;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-sky-700/60 bg-sky-900/30 px-3 py-2 text-xs text-slate-100">
      <div className="flex flex-col">
        <span className="font-semibold">Zone débloquée</span>
        <span className="text-[11px] text-slate-200">{sizeLabel}</span>
      </div>
      <div className="flex flex-col text-[11px] text-slate-200">
        <span>Extensions : {buildZone.expansionsPurchased}</span>
        <span>Coût suivant : {buildZone.nextCost.toLocaleString()}€</span>
      </div>
      <button
        type="button"
        disabled={!canAfford || isMaxed}
        onClick={onExpand}
        className={`ml-auto rounded-md px-3 py-2 text-[11px] font-semibold transition ${
          isMaxed
            ? 'cursor-not-allowed bg-slate-700/60 text-slate-300'
            : canAfford
            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
            : 'bg-amber-900/60 text-amber-200'
        }`}
      >
        {isMaxed ? 'Carte au maximum' : 'Étendre la zone'}
      </button>
    </div>
  );
};
