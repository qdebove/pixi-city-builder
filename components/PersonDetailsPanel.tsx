import React, { useMemo, useState } from 'react';
import { SelectedPersonSnapshot } from '@/types/ui';
import { JOB_DEFINITIONS, SKILL_TREES } from '@/pixi/data/game-model';
import { Trait, Worker } from '@/types/data-contract';
import { InfoImageSlot } from './InfoImageSlot';
import { SpriteResolver } from '@/pixi/assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from '@/pixi/assets/registry';

const isWorker = (profile: SelectedPersonSnapshot['profile']): profile is Worker =>
  'jobs' in profile;

type TabId = 'identity' | 'skills' | 'trees';

const TabButton: React.FC<{ id: TabId; active: boolean; onClick: () => void; label: string }> = ({
  id,
  active,
  onClick,
  label,
}) => (
  <button
    key={id}
    onClick={onClick}
    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? 'bg-sky-800 text-sky-100 shadow'
        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
    }`}
  >
    {label}
  </button>
);

const TraitChips: React.FC<{ traits: Trait[] }> = ({ traits }) => {
  if (traits.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {traits.map((trait) => (
        <span
          key={trait.id}
          className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-semibold text-amber-200"
        >
          {trait.id}
        </span>
      ))}
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="rounded-lg border border-slate-700/70 bg-slate-800/70 p-3 text-[12px] text-slate-200">
    <p className="text-[10px] uppercase text-slate-400">{label}</p>
    <p className="mt-0.5 font-mono text-sm text-white">{value}</p>
  </div>
);

export const PersonDetailsPanel: React.FC<{ person: SelectedPersonSnapshot }> = ({
  person,
}) => {
  const { profile, role } = person;
  const [tab, setTab] = useState<TabId>('identity');
  const identity = profile.identity ?? {
    firstName: profile.id,
    lastName: '',
    age: 0,
    title: role === 'staff' ? 'Personnel' : 'Visiteur',
  };

  const portraitResolver = useMemo(
    () => new SpriteResolver(BASE_ASSET_REGISTRY),
    []
  );

  const portraitInitials = `${identity.firstName?.[0] ?? ''}${identity.lastName?.[0] ?? ''}`.toUpperCase() ||
    profile.id.slice(0, 2).toUpperCase();

  const portraitUri = useMemo(() => {
    const target = role === 'staff' ? 'worker' : 'visitor';
    const resolved = portraitResolver.resolve({
      kind: 'portrait',
      target,
      entity: { id: profile.id, tags: target },
      variant: 'idle',
      seedKey: profile.id,
    });
    return resolved?.uri;
  }, [portraitResolver, profile.id, role]);

  const jobId = isWorker(profile) ? profile.jobs.primary : undefined;
  const jobDef = jobId ? JOB_DEFINITIONS[jobId] : undefined;
  const skillTreeId = jobDef?.skillTreeId;

  const unlockedNodes = useMemo(() => {
    if (!skillTreeId || !isWorker(profile)) return [];
    const progress = profile.skillTrees[skillTreeId];
    if (!progress) return [];

    return Object.entries(progress.unlockedNodes).map(([nodeId, rank]) => ({
      node: SKILL_TREES[skillTreeId]?.nodes[nodeId],
      rank,
      id: nodeId,
    }));
  }, [profile, skillTreeId]);

  const traits = isWorker(profile) ? profile.traits : [];

  const baseCard = (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <InfoImageSlot
          label={identity.firstName || profile.id}
          imageUrl={portraitUri}
          accentColor={role === 'staff' ? '#38bdf8' : '#f472b6'}
          fallbackContent={
            <span className="text-2xl font-black uppercase text-white/80">
              {portraitInitials}
            </span>
          }
        />
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">{role === 'staff' ? 'Personnel' : 'Visiteur'}</span>
          <span className="text-lg font-semibold text-white">{identity.firstName} {identity.lastName}</span>
          <span className="text-[12px] text-slate-300">{identity.title}</span>
          <span className="text-[11px] text-slate-400">{identity.age} ans{identity.origin ? ` • ${identity.origin}` : ''}</span>
          {identity.motto && (
            <span className="text-[11px] text-amber-200">“{identity.motto}”</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {isWorker(profile) ? (
          <>
            <StatTile label="Efficacité" value={profile.stats.efficiency.toFixed(2)} />
            <StatTile
              label="Endurance"
              value={`${profile.resources.endurance.current} / ${profile.resources.endurance.max}`}
            />
            <StatTile
              label="Moral"
              value={`${profile.resources.morale.current} / ${profile.resources.morale.max}`}
            />
            <StatTile label="Polyvalence" value={profile.stats.versatility.toFixed(2)} />
            <StatTile label="Résistance" value={profile.stats.stressResistance.toFixed(2)} />
            <StatTile label="Loyauté" value={profile.stats.loyalty.toFixed(2)} />
          </>
        ) : (
          <>
            <StatTile label="Budget" value={`${profile.budget}€`} />
            <StatTile label="Patience" value={profile.patience.toFixed(2)} />
            <StatTile label="Satisfaction" value={profile.satisfaction.toFixed(2)} />
            <StatTile
              label="Préférences"
              value={`Luxe ${profile.preferences.luxury} • Prix ${profile.preferences.priceSensitivity}`}
            />
            <StatTile
              label="Variété / Discrétion"
              value={`${profile.preferences.variety} / ${profile.preferences.discretion}`}
            />
          </>
        )}
      </div>

      <TraitChips traits={traits} />
    </div>
  );

  const skillCard = (
    <div className="space-y-3 text-sm text-slate-200">
      {isWorker(profile) ? (
        <>
          <div className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/70 px-3 py-2 text-[12px]">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Métier principal</p>
              <p className="font-semibold text-white">{jobDef?.nameKey ?? 'Affectation en cours'}</p>
            </div>
            <span className="rounded-full bg-sky-900/50 px-2 py-1 text-[11px] text-sky-100">
              {unlockedNodes.length} nœud(s) débloqué(s)
            </span>
          </div>

          {unlockedNodes.length > 0 ? (
            <div className="space-y-2">
              {unlockedNodes.map(({ node, rank, id }) => (
                <div
                  key={id}
                  className="flex items-start justify-between rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase text-slate-400">{node?.id ?? id}</span>
                    <span className="text-sm font-semibold text-white">{node?.id ?? 'Nœud inconnu'}</span>
                    {node?.effects && (
                      <span className="text-[11px] text-slate-300">{node.effects.length} effet(s) actifs</span>
                    )}
                  </div>
                  <span className="rounded-full bg-emerald-900/40 px-2 py-1 text-[11px] text-emerald-100">Rang {rank}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-300">Aucune compétence débloquée pour le moment.</p>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-2 text-[13px] text-slate-200">
          Les visiteurs n&apos;ont pas de compétences à débloquer mais peuvent réagir à la réputation et aux bâtiments que vous placez.
        </div>
      )}

      <TraitChips traits={traits} />
    </div>
  );

  const treeCard = (
    <div className="space-y-3">
      {isWorker(profile) && skillTreeId ? (
        (() => {
          const tree = SKILL_TREES[skillTreeId];
          if (!tree) return null;
          const totalNodes = Object.keys(tree.nodes).length;
          const ratio = totalNodes > 0 ? Math.min(1, unlockedNodes.length / totalNodes) : 0;
          return (
            <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Arbre de compétence</p>
                  <p className="text-sm font-semibold text-white">{tree.id}</p>
                </div>
                <span className="text-[12px] text-slate-300">{unlockedNodes.length} / {totalNodes} nœuds</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Object.values(tree.nodes).map((node) => {
                  const rank = unlockedNodes.find((n) => n.id === node.id)?.rank ?? 0;
                  return (
                    <div
                      key={node.id}
                      className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-2"
                    >
                      <p className="text-[11px] uppercase text-slate-400">{node.id}</p>
                      <p className="text-[12px] text-slate-200">Coût {node.cost} • Rang {rank}/{node.maxRank}</p>
                      <p className="text-[11px] text-slate-400">Prerequis : {node.prerequisites.length || '0'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-2 text-[13px] text-slate-200">
          Aucun arbre de compétences n&apos;est associé à ce profil pour l&apos;instant.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2 text-sm text-slate-200">
      <div className="flex flex-wrap gap-2">
        <TabButton id="identity" active={tab === 'identity'} onClick={() => setTab('identity')} label="Identité" />
        <TabButton id="skills" active={tab === 'skills'} onClick={() => setTab('skills')} label="Compétences" />
        <TabButton id="trees" active={tab === 'trees'} onClick={() => setTab('trees')} label="Arbre" />
      </div>

      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3 shadow-lg">
        {tab === 'identity' && baseCard}
        {tab === 'skills' && skillCard}
        {tab === 'trees' && treeCard}
      </div>
    </div>
  );
};
