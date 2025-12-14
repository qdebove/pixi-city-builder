import { DebtSettings } from '../DebtSystem';
import { TimeSettings } from '../TimeSystem';

export const TIME_SETTINGS: TimeSettings = {
  msPerHour: 900,
  hoursPerDay: 24,
  daysPerMonth: 30,
  startDay: 1,
  startMonth: 1,
  startYear: 1,
};

export const DEBT_SETTINGS: DebtSettings = {
  startingBalance: 5200,
  monthlyGrowthRate: 0.08,
  minimumPayment: 350,
  paymentRatio: 0.28,
};
