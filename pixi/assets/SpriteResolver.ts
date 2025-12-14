import {
  AssetDefinition,
  AssetRegistry,
  Condition,
  ResolvedSprite,
  SpriteResolveRequest,
  SpriteRule,
} from '../types/data-contract';

export class SpriteResolver {
  private readonly cache = new Map<string, ResolvedSprite | null>();

  constructor(private readonly registry: AssetRegistry) {}

  public resolve(request: SpriteResolveRequest): ResolvedSprite | null {
    const cacheKey = this.buildCacheKey(request);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const rules = this.collectMatchingRules(request);

    for (const rule of rules) {
      const candidateId = this.pickCandidateId(rule, request);
      if (!candidateId) continue;

      const asset = this.resolveAsset(candidateId);
      if (!asset && rule.fallbackRuleId) {
        const fallback = this.resolveByRuleId(rule.fallbackRuleId, request);
        if (fallback) return fallback;
      }

      if (!asset) continue;

      const resolved = this.buildResolvedSprite(asset, request, rule.id);
      this.cache.set(cacheKey, resolved);
      return resolved;
    }

    this.cache.set(cacheKey, null);
    return null;
  }

  private resolveByRuleId(
    ruleId: string,
    request: SpriteResolveRequest
  ): ResolvedSprite | null {
    const rule = this.registry.rules[ruleId];
    if (!rule) return null;

    const candidateId = this.pickCandidateId(rule, request);
    const asset = candidateId ? this.resolveAsset(candidateId) : null;

    if (!asset && rule.fallbackRuleId) {
      return this.resolveByRuleId(rule.fallbackRuleId, request);
    }

    if (!asset) return null;

    return this.buildResolvedSprite(asset, request, rule.id);
  }

  private buildResolvedSprite(
    asset: AssetDefinition,
    request: SpriteResolveRequest,
    ruleId: string
  ): ResolvedSprite {
    return {
      assetId: asset.id,
      uri: asset.uri,
      kind: asset.kind,
      variant: request.variant,
      facing: request.facing,
      meta: asset.meta,
      animation: asset.animation,
      resolvedByRuleId: ruleId,
    };
  }

  private collectMatchingRules(
    request: SpriteResolveRequest
  ): SpriteRule[] {
    return Object.values(this.registry.rules)
      .filter((rule) => this.matchRule(rule, request))
      .sort((a, b) => b.priority - a.priority);
  }

  private matchRule(rule: SpriteRule, request: SpriteResolveRequest): boolean {
    if (rule.kind !== request.kind || rule.target !== request.target) return false;
    if (rule.variant && rule.variant !== request.variant) return false;
    if (rule.facing && rule.facing !== request.facing) return false;
    if (!rule.conditions) return true;

    const context = this.buildConditionContext(request);
    return this.evaluateCondition(rule.conditions, context);
  }

  private buildConditionContext(
    request: SpriteResolveRequest
  ): Record<string, unknown> {
    return {
      target: request.target,
      variant: request.variant,
      facing: request.facing,
      entity: request.entity,
      ...request.context,
    };
  }

  private pickCandidateId(
    rule: SpriteRule,
    request: SpriteResolveRequest
  ): string | null {
    const candidates = rule.candidates;
    if (candidates.length === 0) return null;

    const mode = rule.mode ?? 'first';
    if (mode === 'first') return candidates[0];

    if (mode === 'random') {
      const index = Math.floor(Math.random() * candidates.length);
      return candidates[index];
    }

    const key = this.computeDeterministicKey(rule, request);
    const index = key % candidates.length;
    return candidates[index];
  }

  private computeDeterministicKey(
    rule: SpriteRule,
    request: SpriteResolveRequest
  ): number {
    const seedParts: string[] = [];
    if (request.seedKey) {
      seedParts.push(String(request.seedKey));
    }

    if (rule.deterministicKeyPaths) {
      rule.deterministicKeyPaths.forEach((path) => {
        const value = this.readPathFromRequest(request, path);
        if (value !== undefined) {
          seedParts.push(String(value));
        }
      });
    }

    if (seedParts.length === 0 && typeof request.entity === 'object') {
      seedParts.push(JSON.stringify(request.entity));
    }

    const seedString = seedParts.join('|');
    return Math.abs(hashString(seedString));
  }

  private resolveAsset(assetId: string): AssetDefinition | null {
    const activePackIds = this.registry.activePackIds ?? [];
    for (const packId of activePackIds) {
      const pack = this.registry.packs?.[packId];
      const override = pack?.assets?.[assetId];
      if (override) return override;
    }

    const base = this.registry.assets[assetId];
    if (base) return base;

    const fallbackChain = base?.fallbacks;
    if (fallbackChain) {
      for (const fb of fallbackChain) {
        const resolved = this.resolveAsset(fb);
        if (resolved) return resolved;
      }
    }

    return null;
  }

  private buildCacheKey(request: SpriteResolveRequest): string {
    const context = request.context ? JSON.stringify(request.context) : '';
    return [
      request.kind,
      request.target,
      request.variant,
      request.facing ?? 'none',
      JSON.stringify(request.entity),
      request.seedKey ?? 'none',
      context,
    ].join('|');
  }

  private evaluateCondition(
    condition: Condition,
    context: Record<string, unknown>
  ): boolean {
    if ('all' in condition && condition.all) {
      return condition.all.every((c) => this.evaluateCondition(c, context));
    }

    if ('any' in condition && condition.any) {
      return condition.any.some((c) => this.evaluateCondition(c, context));
    }

    if ('not' in condition && condition.not) {
      return !this.evaluateCondition(condition.not, context);
    }

    const left = this.readPath(context, condition.path);
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

  private readPathFromRequest(
    request: SpriteResolveRequest,
    path: string
  ): unknown {
    const root: Record<string, unknown> = {
      entity: request.entity as Record<string, unknown>,
      context: request.context ?? {},
      variant: request.variant,
      facing: request.facing,
      target: request.target,
      kind: request.kind,
    };
    return this.readPath(root, path);
  }
}

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const chr = value.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
};

