import {
  PassiveEffect,
  PassiveInstance,
  SkillNode,
  SkillProc,
  Worker,
} from '@/types/data-contract';
import {
  PassiveProcResolver,
  PassiveSources,
  StatModifierBucket,
  applyBucketToStat,
  resolveBucketForTarget,
} from '@/types/passive-resolver';
import {
  BUILDING_PASSIVES_BY_TYPE,
  PASSIVE_DEFINITIONS,
  SKILL_TREES,
} from '../data/game-model';
import { Building } from '../Building';

export interface BuildingSkillSnapshot {
  incomePerTick: number;
  intervalMs: number;
  triggeredEffects: PassiveEffect[];
}

export class SkillEngine {
  private readonly procResolver = new PassiveProcResolver();

  public computeBuildingSnapshot(
    building: Building,
    tick: number
  ): BuildingSkillSnapshot {
    const baseIncome = building.getIncomeWithoutPassives();
    const baseInterval = building.getBaseIntervalMs();

    const passiveBucket = resolveBucketForTarget(
      'building',
      this.collectPassiveSources(building)
    );

    const incomeAfterPassives = applyBucketToStat(
      baseIncome,
      passiveBucket,
      'income'
    );
    const intervalAfterPassives = Math.max(
      250,
      applyBucketToStat(baseInterval, passiveBucket, 'interval')
    );

    const { effects: procEffects } = this.collectReadyProcs(
      building,
      tick
    );
    const procBucket: StatModifierBucket = resolveBucketForTarget('building', {
      instances: [],
      definitions: {},
      inlineEffects: procEffects,
    });

    const incomeAfterProcs = applyBucketToStat(
      incomeAfterPassives,
      procBucket,
      'income'
    );

    return {
      incomePerTick: Math.max(0, Math.floor(incomeAfterProcs)),
      intervalMs: intervalAfterPassives,
      triggeredEffects: procEffects,
    };
  }

  private collectPassiveSources(building: Building): PassiveSources {
    const inlineEffects: PassiveEffect[] = [];

    building.getStaffMembers().forEach((worker) => {
      inlineEffects.push(...this.collectWorkerEffects(worker));
    });

    return {
      instances: this.collectBuildingPassives(building),
      definitions: PASSIVE_DEFINITIONS,
      inlineEffects,
    };
  }

  private collectBuildingPassives(building: Building): PassiveInstance[] {
    if (building.getUnlockedPassives().length > 0) {
      return building.getUnlockedPassives();
    }

    return BUILDING_PASSIVES_BY_TYPE[building.type.id] ?? [];
  }

  private collectWorkerEffects(worker: Worker): PassiveEffect[] {
    const traitEffects = worker.traits.flatMap((trait) => trait.effects);
    const skillEffects = this.collectSkillNodeEffects(worker);
    return [...traitEffects, ...skillEffects];
  }

  private collectSkillNodeEffects(worker: Worker): PassiveEffect[] {
    const effects: PassiveEffect[] = [];

    Object.entries(worker.skillTrees).forEach(([treeId, progress]) => {
      const tree = SKILL_TREES[treeId];
      if (!tree) return;

      Object.entries(progress.unlockedNodes).forEach(([nodeId, rank]) => {
        const node: SkillNode | undefined = tree.nodes[nodeId];
        if (!node || rank <= 0) return;

        node.effects.forEach((effect) => {
          effects.push(this.scaleEffect(effect, rank));
        });
      });
    });

    return effects;
  }

  private collectSkillProcs(worker: Worker): SkillProc[] {
    const procs: SkillProc[] = [];

    Object.entries(worker.skillTrees).forEach(([treeId, progress]) => {
      const tree = SKILL_TREES[treeId];
      if (!tree) return;

      Object.entries(progress.unlockedNodes).forEach(([nodeId, rank]) => {
        const node = tree.nodes[nodeId];
        if (!node || rank <= 0 || !node.procs) return;

        node.procs.forEach((proc) => {
          procs.push({ ...proc, effects: proc.effects.map((e) => this.scaleEffect(e, rank)) });
        });
      });
    });

    return procs;
  }

  private collectReadyProcs(building: Building, tick: number) {
    const workerProcs = building
      .getStaffMembers()
      .flatMap((worker) => this.collectSkillProcs(worker));

    const readyProcs = this.procResolver.getReadyProcs('onIncomeTick', workerProcs, {
      tick,
      subject: {
        buildingId: building.state.instanceId,
        staffCount: building.getStaffMembers().length,
        visitors: building.getVisitors().length,
      },
    });

    const effects = readyProcs.flatMap((proc) => proc.effects);

    return { readyProcs, effects };
  }

  private scaleEffect(effect: PassiveEffect, rank: number): PassiveEffect {
    if (rank === 1) return effect;

    const value = effect.mode === 'multiplicative'
      ? effect.value * (1 + 0.5 * (rank - 1))
      : effect.value * rank;

    return { ...effect, value };
  }
}
