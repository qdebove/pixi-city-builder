export const FEATURES = {
  ENABLE_LEGACY_UI: false,
  ENABLE_RECRUITMENT: false,
  ENABLE_SKILLS: false,
  ENABLE_REPUTATION: false,
  ENABLE_SECURITY: false,
  ENABLE_EVENTS: false,
  ENABLE_DISTRICTS: false,
  ENABLE_ATTRACTION_AI: false,
  ENABLE_SAVE_MANAGER_UI: false,
  ENABLE_ASSET_PACK_UI: false,
  ENABLE_TUTORIAL: false,
  ENABLE_ECONOMY_PANEL: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
