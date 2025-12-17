import { GameSaveState, SavedGameMetadata } from '@/types/save';

const STORAGE_KEY = 'mini-city-tycoon.save';
const SAVE_VERSION = 1;

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const persistGameSave = (payload: GameSaveState) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const loadGameSave = (): GameSaveState | null => {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameSaveState;
    if (parsed.version !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearGameSave = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
};

export const readSavedMetadata = (): SavedGameMetadata | null => {
  const save = loadGameSave();
  if (!save) return null;
  return {
    timestamp: save.timestamp,
    money: save.money,
    day: save.time.day,
    month: save.time.month,
    year: save.time.year,
    activeAssetPacks: save.activeAssetPacks,
  };
};

export const getSaveVersion = () => SAVE_VERSION;
