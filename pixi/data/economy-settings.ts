import rawEconomySettings from './economy-settings.json';

export interface EconomySettings {
  taxes: {
    rate: number;
    minimum: number;
    progressiveThreshold: number;
    progressiveRate: number;
  };
  maintenance: {
    bufferMultiplier: number;
  };
}

export const ECONOMY_SETTINGS = rawEconomySettings as unknown as EconomySettings;
