import React, { useMemo } from 'react';
import { SecuritySnapshot } from '@/pixi/SecuritySystem';
import { WORKER_ROSTER } from '@/pixi/data/game-model';
import { computeWorkerCost } from '@/pixi/data/recruitment';

interface SecurityPanelProps {
  security: SecuritySnapshot;
  guardPresence: { roaming: number; stationed: number };
  hiredGuards: number;
  money: number;
  onHireGuard: () => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  security,
  guardPresence,
  hiredGuards,
  money,
  onHireGuard,
}) => {
  const guardTemplate = useMemo(
    () => WORKER_ROSTER.find((worker) => worker.jobs.primary === 'guard'),
    []
  );

  const guardCost = guardTemplate ? computeWorkerCost(guardTemplate) : 0;
  const guardName = guardTemplate?.identity?.firstName ?? 'Garde dédiée';
  const guardTitle = guardTemplate?.identity?.title ?? 'Patrouilleuse';

  const hireDisabled = hiredGuards > 0 || money < guardCost || !guardTemplate;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-rose-100">Veille sécurité</h3>
        <p className="text-sm text-slate-300">
          Suivez la couverture des gardes et recrutez une protection dédiée. Les gardes
          apparaissent en ocre pour être identifiées rapidement sur la carte.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 shadow">
          <p className="text-[11px] uppercase text-rose-200/80">Indice global</p>
          <p className="text-2xl font-bold text-rose-100">{security.score.toFixed(1)}</p>
          <p className="text-[12px] text-rose-100/70">Score de vigilance actuel</p>
        </div>
        <div className="rounded-lg border border-amber-500/50 bg-amber-950/20 p-3 shadow">
          <p className="text-[11px] uppercase text-amber-200/80">Couverture</p>
          <p className="text-xl font-semibold text-amber-100">{security.guardCoverage.toFixed(1)} zones</p>
          <p className="text-[12px] text-amber-100/70">Patrouilles {guardPresence.roaming} • Postes {guardPresence.stationed}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/20 p-3 shadow">
          <p className="text-[11px] uppercase text-emerald-200/80">Recrues affectées</p>
          <p className="text-xl font-semibold text-emerald-100">{hiredGuards}</p>
          <p className="text-[12px] text-emerald-100/70">Gardes déjà engagées dans votre équipe.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase text-amber-300">Recruter une garde</p>
            <p className="text-sm font-semibold text-white">{guardName}</p>
            <p className="text-[12px] text-slate-300">{guardTitle} • Couleur ocre en patrouille</p>
          </div>
          <span className="rounded-full bg-amber-900/50 px-3 py-1 text-[12px] font-semibold text-amber-100">
            {guardCost.toLocaleString('fr-FR')} €
          </span>
        </div>
        <p className="text-[12px] text-slate-300">
          Cette recrue se déplacera sur les axes routiers en suivant un circuit Manhattan, renforçant la
          présence visible et la notation sécurité.
        </p>
        <button
          type="button"
          disabled={hireDisabled}
          onClick={onHireGuard}
          className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
            hireDisabled
              ? 'cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-amber-600 text-white hover:bg-amber-500'
          }`}
        >
          {hiredGuards > 0
            ? 'Garde déjà engagée'
            : money < guardCost
            ? 'Budget insuffisant'
            : 'Signer et déployer une garde'}
        </button>
      </div>
    </div>
  );
};
