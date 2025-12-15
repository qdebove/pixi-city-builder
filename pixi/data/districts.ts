import districtsData from './districts.json';
import { BuildingType } from '@/types/types';

type BuildingCategory = BuildingType['category'];

export interface DistrictThemeDefinition {
  id: string;
  name: string;
  color: number;
  bonuses: Partial<Record<BuildingCategory, number>>;
}

export interface DistrictZoneDefinition {
  id: string;
  themeId: string;
  name: string;
  color: number;
  area: { x: number; y: number; width: number; height: number };
}

export interface DistrictGenerationSettings {
  minZones: number;
  maxZones: number;
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  maxAttempts: number;
}

export interface DistrictDefinitions {
  themes: DistrictThemeDefinition[];
  generation: DistrictGenerationSettings;
}

export const DISTRICT_DEFINITIONS = districtsData as unknown as DistrictDefinitions;
