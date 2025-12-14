import React, { useMemo, useState } from 'react';
import { PersonRole } from '@/types/types';
import {
  JOB_DEFINITIONS,
  VISITOR_ARCHETYPES,
  WORKER_ROSTER,
} from '@/pixi/data/game-model';
import { Trait, Visitor, Worker } from '@/types/data-contract';

interface PeopleDirectoryProps {
  occupantsByRole: Record<PersonRole, number>;
  movingPeople: Record<PersonRole, number>;
}

const TraitChips: React.FC<{ traits: Trait[] }> = ({ traits }) => {
  if (traits.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {traits.map((trait) => (
        <span
          key={trait.id}
          className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200"
        >
          {trait.id}
        </span>
      ))}
    </div>
  );
};

const WorkerCard: React.FC<{
  worker: Worker;
  expanded: boolean;
  onToggle: () => void;
}> = ({ worker, expanded, onToggle }) => {
  const job = JOB_DEFINITIONS[worker.jobs.primary];
  const treeId = job?.skillTreeId;
  const unlockedNodes = treeId
    ? Object.keys(worker.skillTrees[treeId]?.unlockedNodes ?? {}).length
    : 0;

  return (
    <article className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <div>
          <p className="text-xs uppercase text-slate-400">Personnel</p>
          <p className="text-sm font-semibold text-white">{worker.id}</p>
          {job && (
            <p className="text-[12px] text-slate-300">{job.nameKey}</p>
          )}
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-200">
          {expanded ? 'Fermer' : 'Voir la fiche'}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm text-slate-200">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
              <p className="text-[11px] uppercase text-slate-400">Efficacité</p>
              <p className="font-mono">{worker.stats.efficiency}</p>
            </div>
            <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
              <p className="text-[11px] uppercase text-slate-400">Endurance</p>
              <p className="font-mono">
                {worker.resources.endurance.current} / {worker.resources.endurance.max}
              </p>
            </div>
            <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
              <p className="text-[11px] uppercase text-slate-400">Moral</p>
              <p className="font-mono">
                {worker.resources.morale.current} / {worker.resources.morale.max}
              </p>
            </div>
            {treeId && (
              <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
                <p className="text-[11px] uppercase text-slate-400">Arbre actif</p>
                <p className="font-mono">
                  {treeId} • {unlockedNodes} nœud(s)
                </p>
              </div>
            )}
          </div>

          <TraitChips traits={worker.traits} />
        </div>
      )}
    </article>
  );
};

const VisitorCard: React.FC<{ visitor: Visitor }> = ({ visitor }) => {
  const level = visitor.level ?? 1;
  const experience = visitor.experience ?? 0;
  const experienceToNext = visitor.experienceToNext ?? 100;
  const xpProgress = Math.min(experience / experienceToNext, 1);
  const patienceBonus = 1 + xpProgress * 0.1 + level * 0.05;
  const budgetBonus = 1 + xpProgress * 0.08;

  return (
    <article className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">Visiteur</p>
          <p className="text-sm font-semibold text-white">{visitor.id}</p>
        </div>
        <span className="rounded-full bg-indigo-900/40 px-2 py-1 text-[11px] text-indigo-100">
          Budget : {visitor.budget}€
        </span>
      </header>

      <div className="mt-2 space-y-2">
        <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
          <div className="flex items-center justify-between text-[12px] text-slate-200">
            <span className="font-semibold">Niveau {level}</span>
            <span className="font-mono text-slate-300">
              {experience} / {experienceToNext} XP
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-sky-400"
              style={{ width: `${Math.min(xpProgress * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-amber-200">
            Les visiteurs montent en XP sans arbre de compétences : la barre influe directement leurs caractéristiques.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-[12px] text-slate-200">
          <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
            <dt className="text-[11px] uppercase text-slate-400">Patience</dt>
            <dd className="font-mono">
              {(visitor.patience * patienceBonus).toFixed(1)} (+{((patienceBonus - 1) * 100).toFixed(0)}%)
            </dd>
          </div>
          <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
            <dt className="text-[11px] uppercase text-slate-400">Satisfaction</dt>
            <dd className="font-mono">{visitor.satisfaction}</dd>
          </div>
          <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
            <dt className="text-[11px] uppercase text-slate-400">Budget effectif</dt>
            <dd className="font-mono">
              {(visitor.budget * budgetBonus).toFixed(0)}€ (+{((budgetBonus - 1) * 100).toFixed(0)}%)
            </dd>
          </div>
          <div className="rounded border border-slate-700/60 bg-slate-800/80 p-2">
            <dt className="text-[11px] uppercase text-slate-400">Fatigue</dt>
            <dd className="font-mono">{visitor.fatigue.toFixed(1)}</dd>
          </div>
          <div className="col-span-2 rounded border border-slate-700/60 bg-slate-800/80 p-2">
            <dt className="text-[11px] uppercase text-slate-400">Préférences</dt>
            <dd className="text-[12px] text-slate-200">
              Luxe {visitor.preferences.luxury} • Sensibilité prix {visitor.preferences.priceSensitivity} • Variété {visitor.preferences.variety} • Discrétion {visitor.preferences.discretion}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
};

export const PeopleDirectory: React.FC<PeopleDirectoryProps> = ({
  occupantsByRole,
  movingPeople,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  type PeopleTab = 'overview' | 'workers' | 'visitors';
  const [activeTab, setActiveTab] = useState<PeopleTab>('overview');

  const toggle = (id: string) =>
    setExpandedId((current) => (current === id ? null : id));

  const tabs: { id: PeopleTab; label: string; description: string }[] = useMemo(
    () => [
      { id: 'overview', label: 'Synthèse', description: 'Flux et occupation' },
      { id: 'workers', label: 'Personnel', description: 'Contrats et arbres actifs' },
      { id: 'visitors', label: 'Visiteurs', description: 'Profils et progression XP' },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-sky-200">Fiches des personnes</h3>
        <p className="text-sm text-slate-300">
          Ouvrez chaque fiche depuis ce menu ou en cliquant directement sur une
          personne dans la ville. Les informations sont propres à chaque profil
          (visiteur ou membre du personnel).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/70 bg-slate-800/60 p-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-emerald-900/30 text-emerald-50 border border-emerald-500/60'
                  : 'text-slate-200 border border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex flex-col text-left leading-tight">
                <span>{tab.label}</span>
                <span className="text-[11px] font-normal text-slate-300">{tab.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-[11px] uppercase text-slate-400">Personnes en déplacement</p>
              <p className="text-sm text-slate-200">
                Visiteurs : <span className="font-mono text-pink-200">{movingPeople.visitor}</span> • Personnel :{' '}
                <span className="font-mono text-sky-200">{movingPeople.staff}</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-[11px] uppercase text-slate-400">Personnes hébergées</p>
              <p className="text-sm text-slate-200">
                Visiteurs : <span className="font-mono text-pink-200">{occupantsByRole.visitor}</span> • Personnel :{' '}
                <span className="font-mono text-sky-200">{occupantsByRole.staff}</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
            <p className="font-semibold text-slate-200">Astuce navigation</p>
            <p>
              Les arbres de compétences liés aux métiers sont visibles dans l&apos;onglet
              dédié, mais chaque fiche de personnel liste aussi l&apos;arbre actif et les
              nœuds déjà débloqués.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'workers' && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Personnel disponible
          </h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {WORKER_ROSTER.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                expanded={expandedId === worker.id}
                onToggle={() => toggle(worker.id)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'visitors' && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Profils visiteurs
          </h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {VISITOR_ARCHETYPES.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
