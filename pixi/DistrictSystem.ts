import { Building } from './Building';
import {
  DISTRICT_DEFINITIONS,
  DistrictThemeDefinition,
  DistrictZoneDefinition,
} from './data/districts';
import { BuildingType } from '@/types/types';

export interface DistrictSnapshot {
  zones: { id: string; name: string; theme: string; buildings: number }[];
}

export class DistrictSystem {
  private themes: Map<string, DistrictThemeDefinition> = new Map();
  private zones: DistrictZoneDefinition[] = [];

  constructor() {
    this.themes = new Map(DISTRICT_DEFINITIONS.themes.map((t) => [t.id, t]));
    this.zones = DISTRICT_DEFINITIONS.zones;
  }

  public getDistrictForBuilding(building: Building): DistrictZoneDefinition | null {
    return this.getZoneAt(building.gridX, building.gridY);
  }

  public getIncomeMultiplier(
    building: Building,
    typeOverride?: BuildingType
  ): number {
    const zone = this.getDistrictForBuilding(building);
    if (!zone) return 1;
    const theme = this.themes.get(zone.themeId);
    if (!theme) return 1;
    const category = (typeOverride ?? building.type).category;
    const bonus = theme.bonuses[category];
    if (!bonus) return 1;
    return 1 + bonus;
  }

  public snapshot(buildings: Building[]): DistrictSnapshot {
    const tally: Record<string, number> = {};
    buildings.forEach((b) => {
      const zone = this.getDistrictForBuilding(b);
      if (zone) {
        tally[zone.id] = (tally[zone.id] ?? 0) + 1;
      }
    });

    return {
      zones: this.zones.map((z) => ({
        id: z.id,
        name: z.name,
        theme: this.themes.get(z.themeId)?.name ?? 'N/A',
        buildings: tally[z.id] ?? 0,
      })),
    };
  }

  public getZoneAt(gridX: number, gridY: number): DistrictZoneDefinition | null {
    return (
      this.zones.find((zone) =>
        this.isWithinZone(zone, gridX, gridY)
      ) ?? null
    );
  }

  private isWithinZone(
    zone: DistrictZoneDefinition,
    gridX: number,
    gridY: number
  ): boolean {
    return (
      gridX >= zone.area.x &&
      gridX < zone.area.x + zone.area.width &&
      gridY >= zone.area.y &&
      gridY < zone.area.y + zone.area.height
    );
  }
}
