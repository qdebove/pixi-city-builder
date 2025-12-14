import rawUnlocks from './unlocks.json';

export interface UnlockCondition {
  id: string;
  requiredClicks?: number;
  description?: string;
}

const BUILDING_UNLOCKS_MAP: Readonly<Record<string, UnlockCondition>> = Object.freeze(
  (rawUnlocks as UnlockCondition[]).reduce<Record<string, UnlockCondition>>(
    (acc, condition) => {
      acc[condition.id] = {
        ...condition,
        requiredClicks: condition.requiredClicks ?? 0,
      };
      return acc;
    },
    {}
  )
);

export const BUILDING_UNLOCKS = BUILDING_UNLOCKS_MAP;

export const getBuildingUnlocks = (): Record<string, UnlockCondition> => ({
  ...BUILDING_UNLOCKS_MAP,
});

export const isBuildingUnlocked = (
  buildingId: string,
  totalClicks: number
): { unlocked: boolean; reason?: string } => {
  const condition = BUILDING_UNLOCKS_MAP[buildingId];
  if (!condition) return { unlocked: true };

  const unlocked = (condition.requiredClicks ?? 0) <= totalClicks;
  return {
    unlocked,
    reason: unlocked
      ? undefined
      : `Nécessite ${condition.requiredClicks} ticks de production`,
  };
};
