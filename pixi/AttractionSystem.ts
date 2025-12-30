import { ATTRACTION_SETTINGS } from './data/attraction-settings';
import { ReputationSnapshot } from './ReputationSystem';

export type AttractionFactorImpact = 'positive' | 'negative' | 'base';

export interface AttractionFactor {
  id: string;
  label: string;
  impact: AttractionFactorImpact;
  deltaPerMinute: number;
}

export interface AttractionSnapshot {
  notoriety: number;
  influxPerMinute: number;
  baseRatePerMinute: number;
  reputationContribution: number;
  satisfactionContribution: number;
  saturationPenalty: number;
  factors: AttractionFactor[];
}

export interface AttractionInput {
  reputation: ReputationSnapshot;
  averageSatisfaction: number;
  saturationRatio: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeReputation = (value: number): number =>
  clamp((value + 100) / 2, 0, 100);

export class AttractionSystem {
  private snapshot: AttractionSnapshot;

  constructor() {
    this.snapshot = this.update({
      reputation: { local: 50, premium: 50, regulatoryPressure: 0 },
      averageSatisfaction: 0.5,
      saturationRatio: 0,
    });
  }

  public update(input: AttractionInput): AttractionSnapshot {
    const notoriety = this.computeNotoriety(input.reputation);
    const reputationContribution =
      notoriety * ATTRACTION_SETTINGS.reputationCoefficient;

    const satisfaction = clamp(input.averageSatisfaction, 0, 1);
    const satisfactionContribution =
      (satisfaction - 0.5) * ATTRACTION_SETTINGS.satisfactionImpact;

    const saturationPenalty =
      clamp(input.saturationRatio, 0, 1) * ATTRACTION_SETTINGS.saturationPenalty;

    const rawRate =
      ATTRACTION_SETTINGS.basePerMinute +
      reputationContribution +
      satisfactionContribution -
      saturationPenalty;

    const influxPerMinute = clamp(
      rawRate,
      ATTRACTION_SETTINGS.minPerMinute,
      ATTRACTION_SETTINGS.maxPerMinute
    );

    this.snapshot = {
      notoriety,
      influxPerMinute,
      baseRatePerMinute: ATTRACTION_SETTINGS.basePerMinute,
      reputationContribution,
      satisfactionContribution,
      saturationPenalty,
      factors: [
        {
          id: 'base',
          label: 'Arrivée de base',
          impact: 'base',
          deltaPerMinute: ATTRACTION_SETTINGS.basePerMinute,
        },
        {
          id: 'reputation',
          label: 'Notoriété',
          impact: reputationContribution >= 0 ? 'positive' : 'negative',
          deltaPerMinute: reputationContribution,
        },
        {
          id: 'satisfaction',
          label: 'Satisfaction moyenne',
          impact: satisfactionContribution >= 0 ? 'positive' : 'negative',
          deltaPerMinute: satisfactionContribution,
        },
        {
          id: 'saturation',
          label: 'Saturation',
          impact: 'negative',
          deltaPerMinute: -saturationPenalty,
        },
      ],
    };

    return this.snapshot;
  }

  public snapshotState(): AttractionSnapshot {
    return { ...this.snapshot, factors: [...this.snapshot.factors] };
  }

  private computeNotoriety(reputation: ReputationSnapshot): number {
    const normalizedLocal = normalizeReputation(reputation.local);
    const normalizedPremium = normalizeReputation(reputation.premium);
    const regulationPenalty = clamp(reputation.regulatoryPressure, 0, 100);

    const weightedScore =
      normalizedLocal * ATTRACTION_SETTINGS.notorietyWeights.local +
      normalizedPremium * ATTRACTION_SETTINGS.notorietyWeights.premium -
      regulationPenalty * ATTRACTION_SETTINGS.notorietyWeights.regulation;

    return clamp(weightedScore, 0, 100);
  }
}
