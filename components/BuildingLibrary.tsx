import React, { useMemo, useState } from 'react';
import {
  BUILDING_TYPES,
  BuildingType,
  calculateIncome,
} from '@/types/types';
import { InfoImageSlot } from './InfoImageSlot';
import { BUILDING_UNLOCKS, isBuildingUnlocked } from '@/pixi/data/unlocks';

const categoryLabels: Record<BuildingType['category'], string> = {
  housing: 'Habitations',
  commerce: 'Commerces',
  industry: 'Industries',
  infrastructure: 'Infrastructures',
};

interface BuildingLibraryProps {
  totalClicks: number;
}

export const BuildingLibrary: React.FC<BuildingLibraryProps> = ({ totalClicks }) => {
  const [activeCategory, setActiveCategory] = useState<
    BuildingType['category'] | 'all'
  >('all');

  const sorted = useMemo(
    () => [...BUILDING_TYPES].sort((a, b) => a.cost - b.cost),
    []
  );

  const categories = useMemo<
    (BuildingType['category'] | 'all')[]
  >(() => ['all', ...Array.from(new Set(sorted.map((type) => type.category)))], [sorted]);

  const filtered = useMemo(
    () =>
      sorted.filter(
        (type) => activeCategory === 'all' || type.category === activeCategory
      ),
    [activeCategory, sorted]
  );

  const resolveLabel = (category: BuildingType['category'] | 'all') =>
    category === 'all' ? 'Tous les plans' : categoryLabels[category];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-sky-200">
          Bibliothèque des bâtiments
        </h3>
        <p className="text-sm text-slate-300">
          Retrouvez ici la fiche de chaque type de bâtiment. L&apos;accès se fait
          depuis le bureau d&apos;urbanisme, indépendamment de la sélection en cours sur
          la carte.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/80 bg-slate-800/60 p-2">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-sky-900/40 text-sky-100 border border-sky-500/70'
                  : 'text-slate-200 border border-slate-700 hover:border-slate-500'
              }`}
            >
              {resolveLabel(category)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((type) => {
          const color = `#${type.color.toString(16).padStart(6, '0')}`;
          const baseGain = calculateIncome(type, 1);
          const unlockState = isBuildingUnlocked(type.id, totalClicks);
          const unlockDefinition = BUILDING_UNLOCKS[type.id];

          return (
            <article
              key={type.id}
              className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 shadow-md"
            >
              <header className="flex items-start gap-3">
                <InfoImageSlot
                  label={type.name}
                  accentColor={color}
                  locked={!unlockState.unlocked}
                  lockReason={unlockState.reason}
                  showPreviewOnHover
                  fallbackContent={
                    <span className="text-2xl font-black text-white/80">
                      {type.name.slice(0, 1)}
                    </span>
                  }
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {categoryLabels[type.category]}
                      </p>
                      <h4 className="text-sm font-semibold text-white">
                        {type.name}
                      </h4>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200">
                      {type.isRoad ? 'Infrastructure' : 'Exploitable'}
                    </span>
                  </div>
                  {unlockDefinition?.description && (
                    <p className="text-[12px] text-slate-300 leading-snug">
                      {unlockDefinition.description}
                    </p>
                  )}
                </div>
              </header>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
                <div className="rounded border border-slate-700/60 bg-slate-900/50 p-2">
                  <dt className="text-[11px] uppercase text-slate-400">Coût</dt>
                  <dd className="font-mono text-amber-300">{type.cost} €</dd>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/50 p-2">
                  <dt className="text-[11px] uppercase text-slate-400">
                    Intervalle de base
                  </dt>
                  <dd className="font-mono">{type.baseIntervalMs / 1000}s</dd>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/50 p-2">
                  <dt className="text-[11px] uppercase text-slate-400">Capacité</dt>
                  <dd className="font-mono">
                    {type.capacity > 0 ? `${type.capacity} visiteurs` : '—'}
                  </dd>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/50 p-2">
                  <dt className="text-[11px] uppercase text-slate-400">Personnel</dt>
                  <dd className="font-mono">
                    {type.staffCapacity > 0
                      ? `${type.staffCapacity} postes`
                      : '—'}
                  </dd>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/50 p-2">
                  <dt className="text-[11px] uppercase text-slate-400">Accès</dt>
                  <dd
                    className={`font-mono ${
                      type.requiresRoadAccess === false
                        ? 'text-emerald-300'
                        : 'text-amber-200'
                    }`}
                  >
                    {type.isRoad
                      ? 'Infrastructure'
                      : type.requiresRoadAccess === false
                      ? 'Autonome (hors route)'
                      : 'Doit toucher une route'}
                  </dd>
                </div>
                {!type.isRoad && (
                  <div className="col-span-2 rounded border border-emerald-700/60 bg-emerald-900/30 p-2">
                    <dt className="text-[11px] uppercase text-emerald-200">
                      Gain de base
                    </dt>
                    <dd className="font-mono text-emerald-100">
                      {baseGain} € / tick
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-2 text-[12px] text-slate-400">
                Niveau max : {type.maxLevel} • Santé : {type.baseHealth} • Cadence
                passive : {type.baseIntervalMs / 1000}s
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
};
