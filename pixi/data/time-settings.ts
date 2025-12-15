import { DebtSettings } from '../DebtSystem';
import { TimeSettings } from '../TimeSystem';
import rawTimeSettings from './time-settings.json';

const parsedSettings = rawTimeSettings as unknown as {
  time: TimeSettings;
  debt: DebtSettings;
};

export const TIME_SETTINGS: TimeSettings = parsedSettings.time;
export const DEBT_SETTINGS: DebtSettings = parsedSettings.debt;
