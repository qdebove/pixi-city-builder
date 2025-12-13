import React, { useMemo } from 'react';
import {
  SkillNode,
  SkillTree,
  Trait,
} from '@/types/data-contract';
import { SpriteResolver } from '@/pixi/assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from '@/pixi/assets/registry';
import {
  JOB_DEFINITIONS,
  SKILL_TREES,
  TRAITS,
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

const NodeBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-700 text-slate-200 border border-slate-600">
    {label}
  </span>
);

const NodeRow: React.FC<{ node: SkillNode; index: number }> = ({ node, index }) => {
  const icon = resolveSkillIcon(node);
  const effectDescription = node.effects
    .map((effect) => `${effect.stat} ${effect.mode === 'additive' ? '+' : 'x'}${effect.value}`)
    .join(', ');

  return (
    <li className="flex items-center gap-2 p-2 rounded-md bg-slate-800/60 border border-slate-700">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt={node.id}
          className="w-8 h-8 rounded-md shadow"
        />
      ) : (
        <div className="w-8 h-8 rounded-md bg-slate-600" />
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-100">
            {index + 1}. {node.id}
          </span>
          <NodeBadge label={`Coût ${node.cost}`} />
          <NodeBadge label={`Rang max ${node.maxRank}`} />
        </div>
        <p className="text-[12px] text-slate-300">{effectDescription}</p>
      </div>
    </li>
  );
};

export const SkillTreePreview: React.FC<SkillTreePreviewProps> = ({
  trees,
  traits,
}) => {
  const availableTrees = useMemo(
    () => trees ?? Object.values(SKILL_TREES),
    [trees]
  );
  const availableTraits = useMemo(() => traits ?? TRAITS, [traits]);

  return (
    <div className="mt-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-1">
          Compétences du personnel
        </h3>
        <p className="text-[12px] text-slate-400 mb-2">
          Icônes résolues par règles data-driven (tags, préférences, traits).
        </p>
        <div className="space-y-3">
          {availableTrees.map((tree) => {
            const jobLabel = JOB_DEFINITIONS[tree.jobId]?.nameKey ?? tree.jobId;
            const nodes = Object.values(tree.nodes);
            return (
              <div
                key={tree.id}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-400">{tree.id}</p>
                    <p className="text-sm font-semibold text-sky-200">
                      Spécialité : {jobLabel}
                    </p>
                  </div>
                  <NodeBadge label={`Nœuds ${nodes.length}`} />
                </div>
                <ul className="flex flex-col gap-2">
                  {nodes.map((node, index) => (
                    <NodeRow key={node.id} node={node} index={index} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-1">
          Traits clés
        </h4>
        <ul className="grid grid-cols-2 gap-2">
          {availableTraits.map((trait) => {
            const icon = resolveTraitIcon(trait);
            return (
              <li
                key={trait.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700"
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
                  <p className="text-sm font-semibold text-slate-100">{trait.id}</p>
                  <p className="text-[12px] text-slate-400">
                    {trait.descriptionKey}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
