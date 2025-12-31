import React, { useMemo, useState } from 'react';
import { AttractionSnapshot } from '@/pixi/AttractionSystem';
import { ReputationSnapshot } from '@/pixi/ReputationSystem';

type Props = {
  reputation: ReputationSnapshot;
  attraction: AttractionSnapshot;
  onReduceSaturation?: () => void;
  onBoostSatisfaction?: () => void;
};

const impactTone: Record<
  AttractionSnapshot['factors'][number]['impact'],
  string
> = {
  base: 'text-slate-300',
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
};

export const ReputationPanel: React.FC<Props> = ({
  reputation,
  attraction,
  onReduceSaturation,
  onBoostSatisfaction,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showFactors, setShowFactors] = useState(false);

  const notorietyFill = useMemo(
    () => Math.min(360, Math.max(0, attraction.notoriety * 3.6)),
    [attraction.notoriety]
  );

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:border-sky-500 hover:text-white"
      >
        Ouvrir notoriété & influx
      </button>
    );
  }

  return (
    <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase text-slate-400">
            Notoriété & influx
          </p>
          <p className="text-lg font-semibold text-white">
            {attraction.influxPerMinute.toFixed(1)} entrées/min
          </p>
          <p className="text-[12px] text-slate-300">
            Survole la jauge pour voir le détail des facteurs
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-500"
        >
          Replier
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
            className="relative"
            onMouseEnter={() => setShowFactors(true)}
            onMouseLeave={() => setShowFactors(false)}
          >
            <div
            className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-center shadow-inner"
            style={{
              background: `conic-gradient(#22d3ee ${notorietyFill}deg, #1e293b ${notorietyFill}deg)`,
            }}
          >
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-slate-900/90 text-xs font-semibold text-white shadow">
              <span className="text-[11px] uppercase text-slate-400">
                Notoriété
              </span>
              <span className="text-xl text-sky-200">
                {attraction.notoriety.toFixed(1)}
              </span>
            </div>
            </div>

            {showFactors && (
              <div className="absolute right-[110%] top-1/2 z-10 w-56 -translate-y-1/2 rounded-lg border border-slate-700/80 bg-slate-900/95 p-2 text-[12px] text-slate-200 shadow-xl">
                <p className="mb-1 text-[11px] uppercase text-slate-400">
                Facteurs contributeurs
              </p>
              <ul className="space-y-1">
                {attraction.factors.map((factor) => (
                  <li
                    key={factor.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/60 px-2 py-1"
                  >
                    <span className={impactTone[factor.impact]}>
                      {factor.label}
                    </span>
                    <span className="font-mono text-slate-100">
                      {factor.deltaPerMinute >= 0 ? '+' : ''}
                      {factor.deltaPerMinute.toFixed(1)} /min
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>

          <div className="flex-1 space-y-1 text-[11px] text-slate-300">
            <p>
              Réputation locale ↑ ⇒{' '}
              <span className="font-semibold text-sky-100">
                {attraction.reputationContribution >= 0 ? '+' : ''}
                {attraction.reputationContribution.toFixed(1)} entrées/min
              </span>
            </p>
            <p>
              Saturation actuelle ⇒{' '}
              <span className="font-semibold text-amber-100">
                −{attraction.saturationPenalty.toFixed(1)} entrées/min
              </span>
            </p>
          </div>

          <div className="flex-1 space-y-2 text-[12px] text-slate-200">
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-2">
              <p className="text-[11px] uppercase text-slate-400">Profil</p>
              <p className="text-sm font-semibold text-white">
                Flux projeté :{' '}
              <span className="text-emerald-300">
                {attraction.influxPerMinute.toFixed(1)} /min
              </span>
            </p>
            <p className="text-[11px] text-slate-300">
              Base {attraction.baseRatePerMinute.toFixed(1)} + réputation x{' '}
              {attraction.reputationContribution >= 0 ? '+' : ''}
              {attraction.reputationContribution.toFixed(1)} + satisfaction{' '}
              {attraction.satisfactionContribution >= 0 ? '+' : ''}
              {attraction.satisfactionContribution.toFixed(1)} − saturation{' '}
              {attraction.saturationPenalty.toFixed(1)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-2">
              <p className="text-[11px] uppercase text-slate-400">Locale</p>
              <p className="text-sm font-semibold text-white">
                {reputation.local.toFixed(1)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-2">
              <p className="text-[11px] uppercase text-slate-400">Premium</p>
              <p className="text-sm font-semibold text-white">
                {reputation.premium.toFixed(1)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-2">
              <p className="text-[11px] uppercase text-slate-400">Régulation</p>
              <p className="text-sm font-semibold text-white">
                {reputation.regulatoryPressure.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="font-semibold text-slate-100">Actions rapides :</span>
          <button
            type="button"
            onClick={onReduceSaturation}
            className="rounded-md border border-amber-500/60 bg-amber-900/50 px-2 py-1 font-semibold text-amber-50 transition hover:border-amber-400 hover:bg-amber-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            Réduire la saturation
          </button>
          <button
            type="button"
            onClick={onBoostSatisfaction}
            className="rounded-md border border-emerald-500/60 bg-emerald-900/50 px-2 py-1 font-semibold text-emerald-50 transition hover:border-emerald-400 hover:bg-emerald-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            Booster la satisfaction
          </button>
        </div>
      </div>
    </div>
  );
};
