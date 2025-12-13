import {
  Condition,
  PassiveDefinition,
  PassiveEffect,
  PassiveInstance,
  PassiveTarget,
  SkillProc,
} from './data-contract';

export interface StatModifierBucket {
  additive: Record<string, number>;
  multiplicative: Record<string, number>;
}

export interface PassiveSources {
  instances: PassiveInstance[];
  definitions: Record<string, PassiveDefinition>;
  inlineEffects?: PassiveEffect[];
}

export interface ProcContext {
  tick: number;
  rng?: () => number;
  subject?: Record<string, unknown>;
}

interface ProcRuntimeState {
  cooldownUntilTick?: number;
  windowStartTick?: number;
  windowCount?: number;
}

const createEmptyBucket = (): StatModifierBucket => ({
  additive: {},
  multiplicative: {},
});

const applyEffectToBucket = (
  bucket: StatModifierBucket,
  effect: PassiveEffect
) => {
  const targetBucket =
    effect.mode === 'multiplicative' ? bucket.multiplicative : bucket.additive;
  targetBucket[effect.stat] =
    (targetBucket[effect.stat] ?? 0) + effect.value;
};

export function resolveBucketForTarget(
  target: PassiveTarget,
  sources: PassiveSources
): StatModifierBucket {
  const bucket = createEmptyBucket();

  sources.instances.forEach((instance) => {
    const definition = sources.definitions[instance.passiveId];
    if (!definition) return;
    definition.effects
      .filter((effect) => effect.target === target)
      .forEach((effect) => applyEffectToBucket(bucket, effect));
  });

  sources.inlineEffects
    ?.filter((effect) => effect.target === target)
    .forEach((effect) => applyEffectToBucket(bucket, effect));

  return bucket;
}

export function applyBucketToStat(
  baseValue: number,
  bucket: StatModifierBucket,
  stat: string
): number {
  const additive = bucket.additive[stat] ?? 0;
  const multiplicative = bucket.multiplicative[stat] ?? 0;
  return (baseValue + additive) * (1 + multiplicative);
}

export class PassiveProcResolver {
  private runtime = new Map<string, ProcRuntimeState>();

  public getReadyProcs(
    trigger: SkillProc['trigger'],
    procs: SkillProc[],
    ctx: ProcContext
  ): SkillProc[] {
    return procs.filter((proc) => {
      if (proc.trigger !== trigger) return false;
      if (proc.conditions && !this.evaluateCondition(proc.conditions, ctx.subject)) {
        return false;
      }
      if (!this.isOffCooldown(proc.id, proc.spec, ctx.tick)) return false;
      if (proc.spec?.chance !== undefined) {
        const rng = ctx.rng ?? Math.random;
        if (rng() > proc.spec.chance) return false;
      }
      this.markTriggered(proc.id, proc.spec, ctx.tick);
      return true;
    });
  }

  private isOffCooldown(
    procId: string,
    spec: SkillProc['spec'] | undefined,
    tick: number
  ): boolean {
    if (!spec?.cooldownTicks) return true;
    const state = this.runtime.get(procId);
    if (!state?.cooldownUntilTick) return true;
    return tick >= state.cooldownUntilTick;
  }

  private markTriggered(
    procId: string,
    spec: SkillProc['spec'] | undefined,
    tick: number
  ) {
    const state = this.runtime.get(procId) ?? {};

    if (spec?.cooldownTicks) {
      state.cooldownUntilTick = tick + spec.cooldownTicks;
    }

    if (spec?.maxPerWindow) {
      const windowStart = state.windowStartTick ?? tick;
      const sameWindow = tick - windowStart < 1;
      state.windowStartTick = sameWindow ? windowStart : tick;
      state.windowCount = sameWindow ? (state.windowCount ?? 0) + 1 : 1;
    }

    this.runtime.set(procId, state);
  }

  private evaluateCondition(
    condition: Condition,
    subject: Record<string, unknown> = {}
  ): boolean {
    if ('all' in condition && condition.all) {
      return condition.all.every((c) => this.evaluateCondition(c, subject));
    }

    if ('any' in condition && condition.any) {
      return condition.any.some((c) => this.evaluateCondition(c, subject));
    }

    if ('not' in condition && condition.not) {
      return !this.evaluateCondition(condition.not, subject);
    }

    const left = this.readPath(subject, condition.path);
    const right = condition.value;

    switch (condition.op) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return typeof left === 'number' && left > Number(right);
      case '>=':
        return typeof left === 'number' && left >= Number(right);
      case '<':
        return typeof left === 'number' && left < Number(right);
      case '<=':
        return typeof left === 'number' && left <= Number(right);
      default:
        return false;
    }
  }

  private readPath(subject: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (typeof acc !== 'object' || acc === null) return undefined;
      return (acc as Record<string, unknown>)[key];
    }, subject);
  }
}
