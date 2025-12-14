import React, { useMemo, useState } from 'react';
import {
  SkillNode,
  SkillTree,
  Trait,
  Visitor,
  UnlockRequirements,
} from '@/types/data-contract';
import { SpriteResolver } from '@/pixi/assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from '@/pixi/assets/registry';
import {
  BUILDING_DEFINITIONS,
  JOB_DEFINITIONS,
  PASSIVE_DEFINITIONS,
  SKILL_TREES,
  TRAITS,
  VISITOR_ARCHETYPES,
  WORKER_ROSTER,
} from '@/pixi/data/game-model';

interface SkillTreePreviewProps {
  trees?: SkillTree[];
  traits?: Trait[];
}

const resolver = new SpriteResolver(BASE_ASSET_REGISTRY);

const resolveSkillIcon = (node: SkillNode): string | undefined => {
  const preferredRuleId = node.visuals?.preferredRuleIds?.skillIcon;
  const primaryTag = node.visuals?.tags?.[0];
  const context = { node, preferredRuleId };

  const resolved = resolver.resolve({
    kind: 'icon',
    target: 'skill',
    entity: { id: node.id, tags: primaryTag ?? null },
    variant: 'idle',
    seedKey: node.id,
    context,
  });

  return resolved?.uri;
};

const resolveTraitIcon = (trait: Trait): string | undefined => {
  const preferred = trait.visuals?.preferredRuleIds?.skillIcon;
  const traitTag = trait.visuals?.tags?.[0] ?? 'trait';
  const context = { trait, preferredRuleId: preferred };

  const resolved = resolver.resolve({
    kind: 'icon',
    target: 'skill',
    entity: { id: trait.id, tags: traitTag },
    variant: 'idle',
    seedKey: trait.id,
    context,
  });

  return resolved?.uri;
};

const describeRequirements = (requirements?: UnlockRequirements): string | null => {
  if (!requirements) return null;
  const parts: string[] = [];
  if (requirements.money) {
    parts.push(`⏳ Budget ≥ ${requirements.money}€`);
  }

  const rep = requirements.reputation;
  if (rep?.local?.min !== undefined) parts.push(`Réputation locale ≥ ${rep.local.min}`);
  if (rep?.local?.max !== undefined) parts.push(`Réputation locale ≤ ${rep.local.max}`);
  if (rep?.premium?.min !== undefined)
    parts.push(`Réputation premium ≥ ${rep.premium.min}`);
  if (rep?.premium?.max !== undefined)
    parts.push(`Réputation premium ≤ ${rep.premium.max}`);
  if (rep?.regulatoryPressure?.max !== undefined)
    parts.push(`Pression régul. ≤ ${rep.regulatoryPressure.max}`);

  return parts.length ? parts.join(' • ') : null;
};

const NodeBadge: React.FC<{ label: string; tone?: 'sky' | 'amber' | 'violet' }> = ({
  label,
  tone = 'sky',
}) => (
  <span
    className={`px-2 py-0.5 text-[10px] rounded-full border font-semibold ${
      tone === 'sky'
        ? 'bg-sky-900/30 border-sky-500/60 text-sky-100'
        : tone === 'amber'
        ? 'bg-amber-900/30 border-amber-500/60 text-amber-100'
        : 'bg-violet-900/30 border-violet-500/60 text-violet-100'
    }`}
  >
    {label}
  </span>
);

type TimelineEntry = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon?: string;
  detail?: string;
};

const SkillTimeline: React.FC<{
  title: string;
  subtitle: string;
  accent: 'emerald' | 'violet' | 'amber';
  entries: TimelineEntry[];
}> = ({ title, subtitle, entries, accent }) => {
  const accentBorder =
    accent === 'emerald'
      ? 'border-emerald-500/60 bg-emerald-900/30'
      : accent === 'violet'
      ? 'border-violet-500/60 bg-violet-900/30'
      : 'border-amber-500/60 bg-amber-900/30';

  const accentDot =
    accent === 'emerald'
      ? 'bg-emerald-400'
      : accent === 'violet'
      ? 'bg-violet-400'
      : 'bg-amber-400';

  return (
    <article
      className={`relative flex flex-col gap-3 rounded-2xl border ${accentBorder} p-4 shadow-xl backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300/90">{subtitle}</p>
          <h4 className="text-lg font-semibold text-white">{title}</h4>
        </div>
        <NodeBadge
          label={`${entries.length} paliers`}
          tone={accent === 'amber' ? 'amber' : 'sky'}
        />
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-full items-stretch gap-3">
          {entries.map((entry, index) => (
            <div key={entry.id} className="relative min-w-[220px] flex-1">
              {index < entries.length - 1 && (
                <span
                  className={`absolute left-[calc(100%-6px)] top-1/2 h-0.5 w-6 -translate-y-1/2 rounded-full ${accentDot}`}
                />
              )}
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3 h-full flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Palier {index + 1}</span>
                    <NodeBadge label={entry.badge} tone="violet" />
                  </div>
                  {entry.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.icon}
                      alt={entry.title}
                      className="h-8 w-8 rounded-md border border-slate-700 bg-slate-800 object-cover"
                    />
                  )}
                </div>
                <p className="text-sm font-semibold text-white">{entry.title}</p>
                <p className="text-[12px] text-slate-300">{entry.subtitle}</p>
                {entry.detail && (
                  <p className="mt-1 text-[11px] text-amber-200/90 font-mono">
                    {entry.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

const workerTreeEntries = (trees: SkillTree[]): TimelineEntry[][] =>
  trees.map((tree) =>
    Object.values(tree.nodes)
      .sort((a, b) => a.cost - b.cost)
      .map((node) => {
      const effectDescription = node.effects
        .map(
          (effect) => `${effect.stat} ${effect.mode === 'additive' ? '+' : 'x'}${effect.value}`
        )
        .join(', ');

      return {
        id: node.id,
        title: node.id,
        subtitle: effectDescription,
        badge: `Coût ${node.cost} • Rang max ${node.maxRank}`,
        icon: resolveSkillIcon(node),
        detail: describeRequirements(node.requirements) ?? undefined,
      } satisfies TimelineEntry;
    })
  );

const visitorEntries = (visitors: Visitor[]): TimelineEntry[] =>
  visitors.map((visitor) => {
    const pref = visitor.preferences;
    return {
      id: visitor.id,
      title: visitor.id.replace('visitor_', 'Visiteur '),
      subtitle: `Budget ${visitor.budget}€ • Patience ${(pref.variety * 100).toFixed(0)}%`,
      badge: 'Profil narratif',
      detail: `Luxe ${(pref.luxury * 100).toFixed(0)}% • Prix ${(pref.priceSensitivity * 100).toFixed(0)}% • Discrétion ${(pref.discretion * 100).toFixed(0)}%`,
    };
  });

const buildingEntries = () =>
  Object.values(BUILDING_DEFINITIONS).map((definition) => {
    const passiveNodes: TimelineEntry[] = definition.passiveUnlocks.length
      ? definition.passiveUnlocks.map((passive, index) => {
          const data = PASSIVE_DEFINITIONS[passive.passiveId];
          const effect = data?.effects
            .map((eff) => `${eff.stat} ${eff.mode === 'additive' ? '+' : 'x'}${eff.value}`)
            .join(', ');
          return {
            id: `${definition.id}-${passive.passiveId}-${index}`,
            title: data?.descriptionKey ?? passive.passiveId,
            subtitle: 'Talent de bâtiment débloqué',
            badge: `Niveau ${index + 1}`,
            detail: effect,
          } satisfies TimelineEntry;
        })
      : [
          {
            id: `${definition.id}-base`,
            title: 'Plan de base',
            subtitle: 'Cadence et revenu de base accessibles dès la construction.',
            badge: `${definition.basePassiveIncome ?? definition.baseCost} ⚔️`,
            detail: `Cadence ${(definition.baseIncomeInterval / 1000).toFixed(1)}s • Capacité ${definition.baseVisitorCapacity}`,
          },
        ];

    return passiveNodes;
  });

export const SkillTreePreview: React.FC<SkillTreePreviewProps> = ({
  trees,
  traits,
}) => {
  const [activeTab, setActiveTab] = useState<
    'buildings' | 'workers' | 'visitors' | 'traits'
  >('buildings');
  const availableTrees = useMemo(
    () => trees ?? Object.values(SKILL_TREES),
    [trees]
  );
  const availableTraits = useMemo(() => traits ?? TRAITS, [traits]);

  const workerTracks = useMemo(
    () => workerTreeEntries(availableTrees),
    [availableTrees]
  );
  const visitorTracks = useMemo(
    () => visitorEntries(VISITOR_ARCHETYPES),
    []
  );
  const buildingTracks = useMemo(() => buildingEntries(), []);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/80 bg-slate-800/60 p-2">
        {(
          [
            { id: 'buildings', label: 'Bâtiments', hint: 'Passifs et bonus' },
            { id: 'workers', label: 'Travailleurs', hint: 'Arbres par poste' },
            { id: 'visitors', label: 'Visiteurs', hint: 'Parcours narratifs' },
            { id: 'traits', label: 'Traits', hint: 'Modificateurs globaux' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-violet-900/30 text-violet-100 border border-violet-500/70'
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

      {activeTab === 'buildings' && (
        <SkillTimeline
          accent="emerald"
          title="Feuilles de route par bâtiment"
          subtitle="Passifs et talents dédiés"
          entries={buildingTracks.flat()}
        />
      )}

      {activeTab === 'visitors' && (
        <SkillTimeline
          accent="amber"
          title="Destinées des visiteurs"
          subtitle="Profils narratifs et préférences"
          entries={visitorTracks}
        />
      )}

      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {workerTracks.map((entries, index) => {
            const tree = availableTrees[index];
            const jobLabel = JOB_DEFINITIONS[tree.jobId]?.nameKey ?? tree.jobId;
            const worker = WORKER_ROSTER.find(
              (w) => JOB_DEFINITIONS[w.jobs.primary].skillTreeId === tree.id
            );
            return (
              <SkillTimeline
                key={tree.id}
                accent="violet"
                title={jobLabel}
                subtitle={worker ? `Compétences de ${worker.id}` : 'Arbre de métier'}
                entries={entries}
              />
            );
          })}
        </div>
      )}

      {activeTab === 'traits' && (
        <div>
          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-2">
            Traits clés (loot d&apos;inspiration RPG)
          </h4>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {availableTraits.map((trait) => {
              const icon = resolveTraitIcon(trait);
              return (
                <li
                  key={trait.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 p-2"
                >
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={icon}
                      alt={trait.id}
                      className="w-8 h-8 rounded-md"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-slate-700" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{trait.id}</p>
                    <p className="text-[12px] text-slate-300">{trait.descriptionKey}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
