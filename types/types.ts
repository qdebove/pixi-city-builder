import buildingTypeData from '@/pixi/data/building-types.json';

export interface BuildingType {
  id: string;
  name: string;
  cost: number;
  baseIncome: number;
  color: number;
  maxLevel: number;
  baseHealth: number;
  capacity: number;
  staffCapacity: number;
  staffEfficiency: number;
  isRoad?: boolean;
  category: 'housing' | 'commerce' | 'industry' | 'infrastructure';
  baseIntervalMs: number; // ✅ périodicité de base, propre à chaque type
  width: number;
  height: number;
  requiresRoadAccess?: boolean;
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
}

export const CELL_SIZE = 64;
export const GRID_SIZE = 100;

const normalizeDimension = (value: number | undefined): number =>
  Math.max(1, Math.floor(value ?? 1));

export const BUILDING_TYPES: BuildingType[] = (
  buildingTypeData as unknown as BuildingType[]
).map((type) => ({
  ...type,
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
