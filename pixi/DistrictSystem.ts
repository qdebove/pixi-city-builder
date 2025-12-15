import { Building } from './Building';
import {
  DISTRICT_DEFINITIONS,
  DistrictThemeDefinition,
  DistrictZoneDefinition,
  DistrictGenerationSettings,
} from './data/districts';
import { BuildingType, GRID_SIZE } from '@/types/types';

export interface DistrictSnapshot {
  zones: { id: string; name: string; theme: string; buildings: number }[];
}

export class DistrictSystem {
  private themes: Map<string, DistrictThemeDefinition> = new Map();
  private generation: DistrictGenerationSettings;
  private zones: DistrictZoneDefinition[] = [];

  constructor() {
    this.themes = new Map(DISTRICT_DEFINITIONS.themes.map((t) => [t.id, t]));
    this.generation = DISTRICT_DEFINITIONS.generation;
    this.generateZones();
  }

  public generateZones() {
    const zones: DistrictZoneDefinition[] = [];
    const zoneCount = this.randomInt(
      this.generation.minZones,
      this.generation.maxZones
    );

    let attempts = 0;
    while (zones.length < zoneCount && attempts < this.generation.maxAttempts) {
      attempts += 1;
      const theme = this.pickRandomTheme();
      if (!theme) break;

      const width = this.randomInt(
        this.generation.minSize.width,
        this.generation.maxSize.width
      );
      const height = this.randomInt(
        this.generation.minSize.height,
        this.generation.maxSize.height
      );

      const maxX = Math.max(0, GRID_SIZE - width);
      const maxY = Math.max(0, GRID_SIZE - height);
      const x = this.randomInt(0, maxX);
      const y = this.randomInt(0, maxY);

      const overlaps = zones.some((zone) =>
        this.intersects(zone.area, { x, y, width, height })
      );
      if (overlaps) continue;

      zones.push({
        id: `district_${zones.length + 1}`,
        themeId: theme.id,
        name: `${theme.name} ${zones.length + 1}`,
        color: theme.color,
        area: { x, y, width, height },
      });
    }

    this.zones = zones;
  }

  public getZones() {
    return [...this.zones];
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

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private pickRandomTheme(): DistrictThemeDefinition | undefined {
    if (this.themes.size === 0) return undefined;
    const entries = Array.from(this.themes.values());
    return entries[this.randomInt(0, entries.length - 1)];
  }

  private intersects(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }
}
