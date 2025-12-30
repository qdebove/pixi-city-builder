export interface AttractionSettings {
  basePerMinute: number;
  reputationCoefficient: number;
  satisfactionImpact: number;
  saturationPenalty: number;
  minPerMinute: number;
  maxPerMinute: number;
  notorietyWeights: {
    local: number;
    premium: number;
    regulation: number;
  };
}

export const ATTRACTION_SETTINGS: AttractionSettings = {
  basePerMinute: 10,
  reputationCoefficient: 0.12,
  satisfactionImpact: 12,
  saturationPenalty: 18,
  minPerMinute: 2,
  maxPerMinute: 60,
  notorietyWeights: {
    local: 0.55,
    premium: 0.35,
    regulation: 0.45,
  },
};
