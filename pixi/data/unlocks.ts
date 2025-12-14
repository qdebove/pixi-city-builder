export interface UnlockCondition {
  requiredClicks?: number;
  description?: string;
}

export const BUILDING_UNLOCKS: Record<string, UnlockCondition> = {
  house: {
    requiredClicks: 0,
    description: 'Disponible dès le lancement pour héberger les premiers visiteurs.',
  },
  shop: {
    requiredClicks: 120,
    description: 'Se débloque après quelques cycles économiques pour simuler une attractivité minimale.',
  },
  factory: {
    requiredClicks: 360,
    description: 'Plans industriels réservés aux villes déjà actives et stables.',
  },
  road: {
    requiredClicks: 0,
    description: 'Toujours disponible pour structurer le réseau orthogonal.',
  },
};

export const isBuildingUnlocked = (
  buildingId: string,
  totalClicks: number
): { unlocked: boolean; reason?: string } => {
  const condition = BUILDING_UNLOCKS[buildingId];
  if (!condition) return { unlocked: true };

  const unlocked = (condition.requiredClicks ?? 0) <= totalClicks;
  return {
    unlocked,
    reason: unlocked
      ? undefined
      : `Nécessite ${condition.requiredClicks} ticks de production`,
  };
};
