import { ReputationSnapshot } from './ReputationSystem';
import { TickContext } from './SimulationClock';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface EventEffect {
  incomeMultiplier?: number;
  spawnIntervalMultiplier?: number;
  reputationDeltaPerSecond?: Partial<ReputationSnapshot>;
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

export interface ActiveEventSnapshot {
  id: string;
  title: string;
  description: string;
  remainingMs: number;
  durationMs: number;
  severity: EventSeverity;
  effects: EventEffect;
}

export interface EventModifiers {
  incomeMultiplier: number;
  spawnIntervalMultiplier: number;
  reputationDelta: ReputationSnapshot;
  moneyDelta: number;
  activeEvents: ActiveEventSnapshot[];
}

interface ActiveEventState {
  definition: DynamicEventDefinition;
  remainingMs: number;
}

const EVENT_LIBRARY: DynamicEventDefinition[] = [
  {
    id: 'visitor-surge',
    title: 'Afflux imprévu',
    description:
      'Une convention locale fait grimper le trafic : le flux de visiteurs augmente fortement.',
    durationMs: 14000,
    severity: 'info',
    weight: 1.2,
    effects: {
      spawnIntervalMultiplier: 0.55,
      reputationDeltaPerSecond: { local: 0.35 },
    },
  },
  {
    id: 'regulatory-inspection',
    title: 'Contrôle éclair',
    description:
      'Une inspection rapide impose des standards renforcés. Les revenus baissent légèrement.',
    durationMs: 12000,
    severity: 'warning',
    weight: 1,
    effects: {
      incomeMultiplier: 0.82,
      reputationDeltaPerSecond: { regulatoryPressure: 0.65 },
    },
  },
  {
    id: 'vip-gala',
    title: 'Gala VIP',
    description:
      'Un gala premium attire des clients à fort pouvoir d’achat et améliore la réputation premium.',
    durationMs: 10000,
    severity: 'info',
    weight: 0.8,
    effects: {
      incomeMultiplier: 1.25,
      reputationDeltaPerSecond: { premium: 0.9 },
    },
  },
  {
    id: 'service-outage',
    title: 'Incident technique',
    description:
      'Une partie de l’infrastructure est en maintenance, ralentissant la génération de revenus.',
    durationMs: 9000,
    severity: 'critical',
    weight: 0.6,
    effects: {
      incomeMultiplier: 0.65,
      reputationDeltaPerSecond: { local: -0.5 },
      moneyDeltaPerTick: -2,
    },
  },
];

export class EventSystem {
  private readonly minIntervalMs = 11000;
  private readonly maxIntervalMs = 18000;
  private readonly maxConcurrentEvents = 2;

  private activeEvents: ActiveEventState[] = [];
  private nextEventAtMs: number;

  constructor() {
    this.nextEventAtMs = this.computeNextEventTarget(0);
  }

  public update(ctx: TickContext): EventModifiers {
    this.tickActiveEvents(ctx.deltaMs);

    if (this.shouldTriggerNewEvent(ctx.nowMs)) {
      this.tryStartEvent(ctx.nowMs);
    }

    const modifiers = this.aggregateModifiers(ctx.deltaMs);

    return {
      ...modifiers,
      activeEvents: this.activeEvents.map(({ definition, remainingMs }) => ({
        id: definition.id,
        title: definition.title,
        description: definition.description,
        remainingMs,
        durationMs: definition.durationMs,
        severity: definition.severity,
        effects: definition.effects,
      })),
    };
  }

  private aggregateModifiers(deltaMs: number): Omit<EventModifiers, 'activeEvents'> {
    const seconds = deltaMs / 1000;
    const reputationDelta: ReputationSnapshot = {
      local: 0,
      premium: 0,
      regulatoryPressure: 0,
    };

    let incomeMultiplier = 1;
    let spawnIntervalMultiplier = 1;
    let moneyDelta = 0;

    for (const { definition } of this.activeEvents) {
      incomeMultiplier *= definition.effects.incomeMultiplier ?? 1;
      spawnIntervalMultiplier *=
        definition.effects.spawnIntervalMultiplier ?? 1;
      moneyDelta += definition.effects.moneyDeltaPerTick ?? 0;

      if (definition.effects.reputationDeltaPerSecond) {
        reputationDelta.local +=
          (definition.effects.reputationDeltaPerSecond.local ?? 0) * seconds;
        reputationDelta.premium +=
          (definition.effects.reputationDeltaPerSecond.premium ?? 0) * seconds;
        reputationDelta.regulatoryPressure +=
          (definition.effects.reputationDeltaPerSecond.regulatoryPressure ?? 0) *
          seconds;
      }
    }

    return { reputationDelta, incomeMultiplier, spawnIntervalMultiplier, moneyDelta };
  }

  private tickActiveEvents(deltaMs: number): void {
    this.activeEvents = this.activeEvents
      .map((event) => ({
        ...event,
        remainingMs: Math.max(0, event.remainingMs - deltaMs),
      }))
      .filter((event) => event.remainingMs > 0);
  }

  private shouldTriggerNewEvent(nowMs: number): boolean {
    if (this.activeEvents.length >= this.maxConcurrentEvents) return false;
    return nowMs >= this.nextEventAtMs;
  }

  private tryStartEvent(nowMs: number): void {
    const definition = this.pickWeightedEvent();
    if (!definition) return;

    this.activeEvents.push({
      definition,
      remainingMs: definition.durationMs,
    });

    this.nextEventAtMs = this.computeNextEventTarget(nowMs);
  }

  private pickWeightedEvent(): DynamicEventDefinition | null {
    const totalWeight = EVENT_LIBRARY.reduce((sum, evt) => sum + evt.weight, 0);
    if (totalWeight <= 0) return null;

    const roll = Math.random() * totalWeight;
    let cursor = 0;

    for (const evt of EVENT_LIBRARY) {
      cursor += evt.weight;
      if (roll <= cursor) return evt;
    }

    return EVENT_LIBRARY[EVENT_LIBRARY.length - 1] ?? null;
  }

  private computeNextEventTarget(nowMs: number): number {
    const window = this.maxIntervalMs - this.minIntervalMs;
    const offset = Math.random() * window;
    return nowMs + this.minIntervalMs + offset;
  }
}
