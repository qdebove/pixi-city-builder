import buildingTypeData from '@/pixi/data/building-types.json';

export interface BuildingType {
  id: string;
  name: string;
  cost: number;
  baseIncome: number;
  maintenancePerDay?: number;
  color: number;
  maxLevel: number;
  baseHealth: number;
  capacity: number;
  queueMax?: number;
  staffCapacity: number;
  staffEfficiency: number;
  isRoad?: boolean;
  category: 'housing' | 'commerce' | 'industry' | 'infrastructure';
  baseIntervalMs: number; // ✅ périodicité de base, propre à chaque type
  width: number;
  height: number;
  requiresRoadAccess?: boolean;
  dailyPassiveIncome?: number;
  serviceQuality?: number;
  comfort?: number;
}

export type PersonRole = 'visitor' | 'staff';

export interface BuildingState {
  instanceId: string;
  typeId: string;
  level: number;
  currentHealth: number;
  currentOccupants: number;
  occupants: Record<PersonRole, number>;
  productionIntervalMs: number;
  queueLength: number;
  lastServiceSatisfaction?: number;
  districtId?: string;
  incomeProgressMs?: number;
}

export const CELL_SIZE = 64;
export const GRID_SIZE = 100;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeDimension = (value: number | undefined): number =>
  Math.max(1, Math.floor(value ?? 1));

export const BUILDING_TYPES: BuildingType[] = (
  buildingTypeData as unknown as BuildingType[]
).map((type) => ({
  ...type,
  maintenancePerDay: type.maintenancePerDay ?? 0,
  dailyPassiveIncome: type.dailyPassiveIncome ?? 0,
  queueMax: Math.max(0, Math.floor(type.queueMax ?? 0)),
  serviceQuality: clamp(type.serviceQuality ?? 0.7, 0, 1.25),
  comfort: clamp(type.comfort ?? 0.7, 0, 1.25),
  width: normalizeDimension(type.width),
  height: normalizeDimension(type.height),
  requiresRoadAccess: type.requiresRoadAccess ?? !type.isRoad,
}));

export const getBuildingType = (id: string) =>
  BUILDING_TYPES.find((t) => t.id === id);

export const calculateUpgradeCost = (
  type: BuildingType,
  currentLevel: number
): number => {
  if (currentLevel >= type.maxLevel) return Infinity;
  return Math.floor(type.cost * Math.pow(1.5, currentLevel));
};

export const calculateIncome = (type: BuildingType, level: number): number => {
  return type.baseIncome * level;
};
