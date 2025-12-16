import mapSettingsData from './map-settings.json';

export interface BuildZoneSettings {
  initialSize: number;
  maxSize: number;
  expansionStep: number;
  baseCost: number;
  costGrowth: number;
}

export const MAP_SETTINGS = mapSettingsData as unknown as BuildZoneSettings;
