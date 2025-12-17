import { BuildZoneSnapshot } from '@/pixi/BuildZoneSystem';
import { EconomySnapshot } from '@/pixi/EconomySystem';
import { SecuritySnapshot } from '@/pixi/SecuritySystem';
import { ActiveEventSnapshot } from '@/pixi/EventSystem';
import { DistrictZoneDefinition } from '@/pixi/data/districts';
import { BuildingState } from './types';
import { ReputationSnapshot } from '@/pixi/ReputationSystem';
import { TimeSnapshot } from '@/pixi/TimeSystem';
import { DebtSnapshot } from '@/pixi/DebtSystem';
import { PersonRole } from './types';
import { Visitor, Worker } from './data-contract';

export interface PersistedBuildingState {
  gridX: number;
  gridY: number;
  typeId: string;
  state: BuildingState;
  staffIds: string[];
  visitorCount: number;
}

export interface EventSystemSave {
  active: ActiveEventSnapshot[];
  nextEventAtMs: number;
  nextInstanceId: number;
}

export interface SimulationSaveState {
  tick: number;
  nowMs: number;
}

export interface PersistedPersonPathNode {
  x: number;
  y: number;
}

export type PersistedPersonBehavior =
  | { kind: 'wander' }
  | { kind: 'patrol'; basePath: PersistedPersonPathNode[] }
  | { kind: 'entering'; targetInstanceId: string };

export interface PersistedPersonState {
  id: string;
  role: PersonRole;
  profile: Visitor | Worker;
  path: PersistedPersonPathNode[];
  segmentIndex: number;
  segmentProgress: number;
  paused: boolean;
  behavior: PersistedPersonBehavior;
}

export interface PersistedPeopleState {
  elapsedSinceSpawn: number;
  spawnIntervalMultiplier: number;
  persons: PersistedPersonState[];
}

export interface GameSaveState {
  version: number;
  timestamp: number;
  money: number;
  totalClicks: number;
  buildings: PersistedBuildingState[];
  hiredWorkers: string[];
  time: TimeSnapshot;
  debt: DebtSnapshot;
  economy: EconomySnapshot;
  reputation: ReputationSnapshot;
  security: SecuritySnapshot;
  buildZone: BuildZoneSnapshot;
  districts: DistrictZoneDefinition[];
  events: EventSystemSave;
  simulation: SimulationSaveState;
  activeAssetPacks: string[];
  people?: PersistedPeopleState;
}

export interface SavedGameMetadata {
  timestamp: number;
  money: number;
  day: number;
  month: number;
  year: number;
  activeAssetPacks: string[];
}
