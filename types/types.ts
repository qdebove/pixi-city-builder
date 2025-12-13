export interface BuildingType {
  id: string;
  name: string;
  cost: number;
  baseIncome: number;
  color: number;
  maxLevel: number;
  autoClickerUnlockLevel: number;
  autoClickerMaxLevel: number;
  baseHealth: number;
  capacity: number;
  isRoad?: boolean;
  category: 'housing' | 'commerce' | 'industry' | 'infrastructure';
  baseIntervalMs: number; // ✅ périodicité de base, propre à chaque type
}

export type PersonRole = 'visitor' | 'staff';

export interface BuildingState {
  instanceId: string;
  typeId: string;
  level: number;
  currentHealth: number;
  currentOccupants: number;
  occupants: Record<PersonRole, number>;
  isAutoClickerUnlocked: boolean;
  isAutoClickerActive: boolean;
  autoClickerInterval: number;
  autoClickerLevel: number;
}

export const CELL_SIZE = 64;
export const GRID_SIZE = 100;

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: 'house',
    name: 'Petite Maison',
    cost: 100,
    baseIncome: 10,
    color: 0x3b82f6,
    maxLevel: 5,
    autoClickerUnlockLevel: 3,
    autoClickerMaxLevel: 5,
    baseHealth: 100,
    capacity: 2,
    category: 'housing',
    baseIntervalMs: 2500, // 2,5s
  },
  {
    id: 'shop',
    name: 'Magasin',
    cost: 500,
    baseIncome: 60,
    color: 0x22c55e,
    maxLevel: 10,
    autoClickerUnlockLevel: 5,
    autoClickerMaxLevel: 7,
    baseHealth: 250,
    capacity: 5,
    category: 'commerce',
    baseIntervalMs: 2000, // 2s
  },
  {
    id: 'factory',
    name: 'Usine',
    cost: 1200,
    baseIncome: 150,
    color: 0xef4444,
    maxLevel: 15,
    autoClickerUnlockLevel: 7,
    autoClickerMaxLevel: 10,
    baseHealth: 500,
    capacity: 10,
    category: 'industry',
    baseIntervalMs: 1500, // 1,5s
  },
  {
    id: 'road',
    name: 'Route',
    cost: 20,
    baseIncome: 0,
    color: 0x6b7280,
    maxLevel: 1,
    autoClickerUnlockLevel: 999,
    autoClickerMaxLevel: 0,
    baseHealth: 9999,
    capacity: 0,
    isRoad: true,
    category: 'infrastructure',
    baseIntervalMs: 0,
  },
];

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

export const calculateAutoClickerUpgradeCost = (
  type: BuildingType,
  currentAutoClickerLevel: number
): number => {
  const nextLevel = currentAutoClickerLevel + 1;
  return Math.floor((type.cost / 2) * Math.pow(1.4, nextLevel - 1));
};
