import { Visitor, Worker } from '@/types/data-contract';
import { VISITOR_ARCHETYPES, WORKER_ROSTER } from './game-model';

const cloneVisitor = (base: Visitor): Visitor => ({
  ...base,
  id: `${base.id}_${crypto.randomUUID()}`,
  preferences: { ...base.preferences },
  visuals: base.visuals ? { ...base.visuals } : undefined,
  identity: base.identity ? { ...base.identity } : undefined,
});

const cloneWorker = (base: Worker): Worker => ({
  ...base,
  id: `${base.id}_${crypto.randomUUID()}`,
  stats: { ...base.stats },
  resources: {
    endurance: { ...base.resources.endurance },
    health: { ...base.resources.health },
    morale: { ...base.resources.morale },
  },
  jobs: { primary: base.jobs.primary, secondary: [...base.jobs.secondary] },
  skillTrees: Object.entries(base.skillTrees).reduce<Worker['skillTrees']>(
    (acc, [treeId, progress]) => {
      acc[treeId] = {
        unlockedNodes: { ...progress.unlockedNodes },
      };
      return acc;
    },
    {}
  ),
  traits: base.traits.map((trait) => ({
    ...trait,
    visuals: trait.visuals ? { ...trait.visuals } : undefined,
  })),
  needs: base.needs ? { ...base.needs } : undefined,
  identity: base.identity ? { ...base.identity } : undefined,
});

export class PersonFactory {
  public createVisitor(): Visitor {
    const template =
      VISITOR_ARCHETYPES[Math.floor(Math.random() * VISITOR_ARCHETYPES.length)];
    return cloneVisitor(template);
  }

  public createWorker(): Worker {
    const template =
      WORKER_ROSTER[Math.floor(Math.random() * WORKER_ROSTER.length)];
    return cloneWorker(template);
  }

  public createWorkerFromTemplate(template: Worker): Worker {
    return cloneWorker(template);
  }
}
