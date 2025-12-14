import rawEvents from './events.json';
import { DynamicEventDefinition } from '@/types/events';

const normalizeEvent = (definition: DynamicEventDefinition): DynamicEventDefinition => ({
  ...definition,
  effects: {
    ...definition.effects,
    reputationDeltaPerSecond: definition.effects.reputationDeltaPerSecond
      ? { ...definition.effects.reputationDeltaPerSecond }
      : undefined,
  },
});

const EVENT_DEFINITIONS: readonly DynamicEventDefinition[] = (
  rawEvents as DynamicEventDefinition[]
).map(normalizeEvent);

export const getEventDefinitions = (): DynamicEventDefinition[] =>
  EVENT_DEFINITIONS.map((definition) => normalizeEvent(structuredClone(definition)));
