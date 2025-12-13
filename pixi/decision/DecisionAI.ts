import { Visitor, Worker } from '@/types/data-contract';
import { BUILDING_TYPES, BuildingType, PersonRole } from '@/types/types';
import { Building } from '../Building';

export type EntryDecision = { building: Building; desire: number };

type WeightedBuilding = { building: Building; score: number };

type Category = BuildingType['category'];

const CATEGORY_BASE_DESIRE: Record<Category, number> = {
  housing: 0.55,
  commerce: 0.8,
  industry: 0.45,
  infrastructure: 0.35,
};

const DISCRETION_AFFINITY: Record<Category, number> = {
  housing: 0.6,
  commerce: 0.25,
  industry: 0.15,
  infrastructure: 0.2,
};

const JOB_CATEGORY_AFFINITY: Record<string, Partial<Record<Category, number>>> = {
  concierge: { housing: 1.1, commerce: 1.15 },
  technician: { industry: 1.15, infrastructure: 1.1 },
};

const MAX_BASE_INCOME = Math.max(...BUILDING_TYPES.map((t) => t.baseIncome));

export class DecisionAI {
  constructor() {}

  public chooseBuildingForVisitor(
    visitor: Visitor,
    candidates: Building[]
  ): EntryDecision | null {
    const scored = candidates
      .filter((building) => building.hasCapacityFor('visitor'))
      .map((building) => ({ building, score: this.scoreVisitorBuilding(visitor, building) }))
      .filter(({ score }) => score > 0);

    if (scored.length === 0) return null;

    const bestScore = Math.max(...scored.map((s) => s.score));
    const picked = this.pickWeighted(scored);
    const desire = this.normalizeDesire(picked.score, bestScore, 0.3, 0.9);
    return { building: picked.building, desire };
  }

  public chooseBuildingForWorker(worker: Worker, candidates: Building[]): EntryDecision | null {
    const scored = candidates
      .filter((building) => building.hasCapacityFor('staff'))
      .map((building) => ({ building, score: this.scoreWorkerBuilding(worker, building) }))
      .filter(({ score }) => score > 0);

    if (scored.length === 0) return null;

    const bestScore = Math.max(...scored.map((s) => s.score));
    const picked = this.pickWeighted(scored);
    const desire = this.normalizeDesire(picked.score, bestScore, 0.35, 0.95);
    return { building: picked.building, desire };
  }

  private scoreVisitorBuilding(visitor: Visitor, building: Building): number {
    const occupancyPenalty = this.computeOccupancyPenalty(building, 'visitor');
    const incomePull = this.normalizeIncome(building.type.baseIncome);
    const categoryBase = CATEGORY_BASE_DESIRE[building.type.category] ?? 0.5;
    const luxuryBonus = incomePull * visitor.preferences.luxury * 0.85;
    const pricePressure = incomePull * visitor.preferences.priceSensitivity * 0.35;
    const discretionBonus =
      (DISCRETION_AFFINITY[building.type.category] ?? 0.2) * visitor.preferences.discretion;
    const varietyNoise = 0.85 + this.getDeterministicNoise(building.type.id) * 0.3;
    const patienceMitigation = 1 - (1 - visitor.patience) * 0.25;

    const rawScore =
      (categoryBase + luxuryBonus + discretionBonus + varietyNoise * visitor.preferences.variety) *
      occupancyPenalty *
      patienceMitigation -
      pricePressure;

    return Math.max(0, rawScore);
  }

  private scoreWorkerBuilding(worker: Worker, building: Building): number {
    const needScore = building.getStaffNeedScore();
    if (needScore <= 0) return 0;

    const moraleRatio = this.safeRatio(worker.resources.morale.current, worker.resources.morale.max);
    const enduranceRatio = this.safeRatio(
      worker.resources.endurance.current,
      worker.resources.endurance.max
    );
    const stability = (moraleRatio + enduranceRatio) / 2;

    const affinity = this.getJobAffinity(worker.jobs.primary, building.type.category);
    const efficiencyBoost = 1 + worker.stats.efficiency * 0.2 + worker.stats.versatility * 0.05;
    const stressShield = 1 + worker.stats.stressResistance * 0.1;
    const loyaltyFloor = 0.8 + worker.stats.loyalty * 0.1;
    const occupancyPenalty = this.computeOccupancyPenalty(building, 'staff');

    const rawScore =
      needScore *
      affinity *
      stability *
      efficiencyBoost *
      stressShield *
      loyaltyFloor *
      occupancyPenalty;

    return Math.max(0, rawScore);
  }

  private computeOccupancyPenalty(building: Building, role: PersonRole): number {
    const ratio = building.getOccupancyRatioFor(role);
    if (ratio <= 0) return 1;
    const adjusted = 1 - Math.min(0.85, ratio * 1.1);
    return Math.max(0.05, adjusted);
  }

  private normalizeIncome(value: number): number {
    if (MAX_BASE_INCOME <= 0) return 0.5;
    return Math.min(1, Math.max(0, value / MAX_BASE_INCOME));
  }

  private getJobAffinity(jobId: string, category: Category): number {
    const map = JOB_CATEGORY_AFFINITY[jobId];
    if (!map) return 1;
    return map[category] ?? 1;
  }

  private pickWeighted(items: WeightedBuilding[]): WeightedBuilding {
    const total = items.reduce((sum, item) => sum + item.score, 0);
    if (total <= 0) return items[0];

    const roll = Math.random() * total;
    let acc = 0;
    for (const item of items) {
      acc += item.score;
      if (roll <= acc) return item;
    }
    return items[items.length - 1];
  }

  private normalizeDesire(
    score: number,
    bestScore: number,
    min: number,
    max: number
  ): number {
    if (bestScore <= 0) return min;
    const ratio = score / bestScore;
    const scaled = min + (max - min) * Math.min(1, Math.max(0, ratio));
    return Math.max(min, Math.min(max, scaled));
  }

  private getDeterministicNoise(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const normalized = (Math.abs(hash) % 1000) / 1000;
    return normalized;
  }

  private safeRatio(current: number, max: number): number {
    if (max <= 0) return 1;
    return Math.min(1, Math.max(0, current / max));
  }
}
