import React, { useMemo, useState } from 'react';
import { JOB_DEFINITIONS, WORKER_ROSTER } from '@/pixi/data/game-model';
import { ReputationSnapshot } from '@/pixi/ReputationSystem';
import { PersonRole } from '@/types/types';
import { Worker } from '@/types/data-contract';
import { InfoImageSlot } from './InfoImageSlot';
import { SpriteResolver } from '@/pixi/assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from '@/pixi/assets/registry';

interface RecruitmentBoardProps {
  reputation: ReputationSnapshot;
  totalClicks: number;
  money: number;
  occupantsByRole: Record<PersonRole, number>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

const describeProgression = (totalClicks: number) => {
  if (totalClicks > 1200) return 'Cité florissante';
  if (totalClicks > 800) return 'Quartier animé';
  if (totalClicks > 400) return 'Bloc émergent';
  return 'Chantier pionnier';
};

interface CandidateProfile {
  worker: Worker;
  baseCost: number;
  readiness: number;
  status: string;
  gate: number;
  loyaltySignal: string;
  premiumExpectation: number;
}

export const RecruitmentBoard: React.FC<RecruitmentBoardProps> = ({
  reputation,
  totalClicks,
  money,
  occupantsByRole,
}) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'signals'>(
    'candidates'
  );
  const portraitResolver = useMemo(
    () => new SpriteResolver(BASE_ASSET_REGISTRY),
    []
  );

  const staffPressure = Math.max(
    0,
    occupantsByRole.visitor - occupantsByRole.staff * 2
  );

  const candidates = useMemo<CandidateProfile[]>(() => {
    return WORKER_ROSTER.map((worker) => {
      const baseCost = 300 + worker.stats.efficiency * 180 + worker.level * 90;

      const progressionGate = 120 + worker.level * 80;
      const localNeed = 38 + worker.stats.loyalty * 12;
      const premiumNeed = 35 + worker.stats.versatility * 10;

      const readiness = clamp(
        (totalClicks / progressionGate) * 0.35 +
          (reputation.local / localNeed) * 0.3 +
          (reputation.premium / premiumNeed) * 0.2 +
          clamp(money / (baseCost * 2.2), 0, 1) * 0.15,
        0,
        1.35
      );

      const status =
        readiness >= 1
          ? 'Disponible'
          : readiness >= 0.65
          ? 'En pré-contrat'
          : 'En repérage';

      const loyaltySignal =
        reputation.regulatoryPressure > 60
          ? "Vigilante face aux contrôles"
          : reputation.local > reputation.premium
          ? 'Recherche un ancrage local'
          : 'Attirée par la clientèle premium';

      return {
        worker,
        baseCost,
        readiness,
        status,
        gate: progressionGate,
        loyaltySignal,
        premiumExpectation: premiumNeed,
      };
    }).sort((a, b) => b.readiness - a.readiness);
  }, [money, reputation, totalClicks]);

  const progressionLabel = describeProgression(totalClicks);
  const staffingHint =
    staffPressure > 0
      ? `Priorité : combler ${staffPressure} postes pour absorber les visiteurs.`
      : "Équipe équilibrée : privilégiez les profils rares ou hybrides.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-sky-200">Agence de recrutement</h3>
        <p className="text-sm text-slate-300">
          Interface façon RPG : chaque candidate arrive avec ses conditions, son
          arbre de talents actif et un niveau d&apos;affinité qui dépend de votre
          progression ({progressionLabel}), de la réputation ({reputation.local.toFixed(
            1
          )}
          /{reputation.premium.toFixed(1)}) et des finances actuelles.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/80 bg-slate-800/60 p-2">
        {(
          [
            { id: 'candidates', label: 'Candidatures', hint: 'Dossiers disponibles' },
            { id: 'signals', label: 'Signaux', hint: 'Finances et réputation' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-sky-900/40 text-sky-100 border border-sky-500/70'
                  : 'text-slate-200 border border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col text-left leading-tight">
                <span>{tab.label}</span>
                <span className="text-[11px] font-normal text-slate-300">{tab.hint}</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeTab === 'signals' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-[11px] uppercase text-slate-400">Budget dédié</p>
            <p className="text-sm font-semibold text-amber-200">{formatCurrency(money)}</p>
            <p className="text-[12px] text-slate-400">Capital disponible pour signer les contrats.</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-[11px] uppercase text-slate-400">Réputation</p>
            <p className="text-sm text-slate-200">
              Locale {reputation.local.toFixed(1)} • Premium {reputation.premium.toFixed(1)} • Régulation {reputation.regulatoryPressure.toFixed(1)}
            </p>
            <p className="text-[12px] text-slate-400">Impacte les attentes et primes d&apos;arrivée.</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-[11px] uppercase text-slate-400">Besoins opérationnels</p>
            <p className="text-sm text-slate-200">{staffingHint}</p>
            <p className="text-[12px] text-slate-400">Ajuste les recommandations de profils.</p>
          </div>
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {candidates.map((candidate) => {
            const { worker } = candidate;
            const job = JOB_DEFINITIONS[worker.jobs.primary];
            const readinessPercent = Math.round(clamp(candidate.readiness, 0, 1) * 100);
            const portraitUri = portraitResolver.resolve({
              kind: 'portrait',
              target: 'worker',
              entity: { id: worker.id, tags: 'worker' },
              variant: 'idle',
              seedKey: worker.id,
            })?.uri;
            const isLocked = candidate.readiness < 1;

            return (
              <article
                key={worker.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3 shadow-lg"
              >
                <header className="flex items-start gap-3">
                  <InfoImageSlot
                    label={worker.identity?.firstName ?? worker.id}
                    imageUrl={portraitUri}
                    accentColor="#38bdf8"
                    locked={isLocked}
                    lockReason={
                      isLocked
                        ? `Prête à ${readinessPercent}%`
                        : undefined
                    }
                  />
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase text-slate-400">{job?.nameKey ?? 'Poste polyvalent'}</p>
                      <p className="text-sm font-semibold text-white">{worker.identity?.firstName} {worker.identity?.lastName}</p>
                      <p className="text-[12px] text-slate-300">{worker.identity?.title ?? 'Profil adaptable'}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        candidate.status === 'Disponible'
                          ? 'bg-emerald-700/60 text-emerald-50'
                          : candidate.status === 'En pré-contrat'
                          ? 'bg-amber-700/50 text-amber-50'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {candidate.status}
                    </span>
                  </div>
                </header>

                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded bg-slate-800">
                    <div
                      className="h-full rounded bg-sky-400 transition-all"
                      style={{ width: `${readinessPercent}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-slate-300">{readinessPercent}%</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] text-slate-200">
                  <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
                    <p className="text-[11px] uppercase text-slate-400">Coût de base</p>
                    <p className="font-mono text-amber-200">{formatCurrency(candidate.baseCost)}</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
                    <p className="text-[11px] uppercase text-slate-400">Porte d&apos;entrée</p>
                    <p className="font-mono">{candidate.gate} clics</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
                    <p className="text-[11px] uppercase text-slate-400">Signal premium</p>
                    <p className="font-mono">{candidate.premiumExpectation.toFixed(0)}</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
                    <p className="text-[11px] uppercase text-slate-400">Loyauté</p>
                    <p className="font-mono">{candidate.loyaltySignal}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
