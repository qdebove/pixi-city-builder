import { DynamicEventDefinition, EventEffect } from '@/types/events';
import { ReputationSnapshot } from './ReputationSystem';
import { TickContext } from './SimulationClock';
import { getEventDefinitions } from './data/events';

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

export class EventSystem {
  private readonly minIntervalMs = 11000;
  private readonly maxIntervalMs = 18000;
  private readonly maxConcurrentEvents = 2;

  private readonly eventLibrary: DynamicEventDefinition[];
  private activeEvents: ActiveEventState[] = [];
  private nextEventAtMs: number;

  constructor() {
    this.eventLibrary = getEventDefinitions();
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
    const totalWeight = this.eventLibrary.reduce((sum, evt) => sum + evt.weight, 0);
    if (totalWeight <= 0) return null;

    const roll = Math.random() * totalWeight;
    let cursor = 0;

    for (const evt of this.eventLibrary) {
      cursor += evt.weight;
      if (roll <= cursor) return evt;
    }

    return this.eventLibrary[this.eventLibrary.length - 1] ?? null;
  }

  private computeNextEventTarget(nowMs: number): number {
    const window = this.maxIntervalMs - this.minIntervalMs;
    const offset = Math.random() * window;
    return nowMs + this.minIntervalMs + offset;
  }
}
