import districtsData from './districts.json';
import { BuildingType } from '@/types/types';

type BuildingCategory = BuildingType['category'];

export interface DistrictThemeDefinition {
  id: string;
  name: string;
  bonuses: Partial<Record<BuildingCategory, number>>;
}

export interface DistrictZoneDefinition {
  id: string;
  themeId: string;
  name: string;
  area: { x: number; y: number; width: number; height: number };
}

export interface DistrictDefinitions {
  themes: DistrictThemeDefinition[];
  zones: DistrictZoneDefinition[];
}

export const DISTRICT_DEFINITIONS = districtsData as unknown as DistrictDefinitions;
