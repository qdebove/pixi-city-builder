export type EventSeverity = 'info' | 'warning' | 'critical';

export interface EventEffect {
  incomeMultiplier?: number;
  spawnIntervalMultiplier?: number;
  reputationDeltaPerSecond?: {
    local?: number;
    premium?: number;
    regulatoryPressure?: number;
  };
  moneyDeltaPerTick?: number;
}

export interface DynamicEventDefinition {
  id: string;
  title: string;
  description: string;
  durationMs: number;
  severity: EventSeverity;
  weight: number;
  effects: EventEffect;
}
