import { Building } from './Building';
import { EconomySettings } from './data/economy-settings';
import { TimeSettings } from './TimeSystem';
import { Worker } from '@/types/data-contract';
import { calculateIncome } from '@/types/types';

export const INCOME_CATEGORIES = ['operations', 'passive', 'events', 'other'] as const;
export const EXPENSE_CATEGORIES = [
  'construction',
  'maintenance',
  'salaries',
  'debt',
  'taxes',
  'hiring',
  'expansion',
  'events',
  'other',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface EconomySnapshot {
  dailyMaintenance: number;
  dailySalaries: number;
  dailyPassiveIncome: number;
  lastDailyIncome: number;
  lastMonthlyTax: number;
  monthIncome: number;
  monthExpenses: number;
  projectedTax: number;
  incomeByCategory: Record<IncomeCategory, number>;
  expenseByCategory: Record<ExpenseCategory, number>;
  projection: {
    daysElapsed: number;
    daysRemaining: number;
    projectedIncome: number;
    projectedExpenses: number;
    projectedNet: number;
    averageDailyNet: number;
  };
}

export class EconomySystem {
  private readonly settings: EconomySettings;
  private readonly time: TimeSettings;
  private monthIncome = 0;
  private monthExpenses = 0;
  private lastMonthlyTax = 0;
  private cachedMaintenancePerDay = 0;
  private cachedSalariesPerDay = 0;
  private cachedPassiveIncomePerDay = 0;
  private lastDailyIncome = 0;
  private incomeByCategory: Record<IncomeCategory, number>;
  private expenseByCategory: Record<ExpenseCategory, number>;

  constructor(settings: EconomySettings, time: TimeSettings) {
    this.settings = settings;
    this.time = time;
    this.incomeByCategory = this.createIncomeLedger();
    this.expenseByCategory = this.createExpenseLedger();
  }

  public recordIncome(amount: number, category: IncomeCategory = 'operations') {
    if (amount <= 0) return;
    this.monthIncome += amount;
    this.incomeByCategory[category] += amount;
  }

  public recordExpense(amount: number, category: ExpenseCategory = 'other') {
    if (amount <= 0) return;
    this.monthExpenses += amount;
    this.expenseByCategory[category] += amount;
  }

  public applyDailyIncome(buildings: Building[], daysAdvanced: number): number {
    const perDay = buildings.reduce((acc, building) => {
      if (building.type.dailyPassiveIncome && building.type.dailyPassiveIncome > 0) {
        const base = building.type.dailyPassiveIncome;
        const occupancyScale = Math.max(
          0,
          building.getIncomeWithoutPassives() /
            Math.max(1, calculateIncome(building.type, building.state.level))
        );
        return acc + base * occupancyScale;
      }
      return acc;
    }, 0);

    this.cachedPassiveIncomePerDay = perDay;
    const total = Math.floor(perDay * Math.max(1, daysAdvanced));
    this.lastDailyIncome = total;
    if (total > 0) {
      this.recordIncome(total, 'passive');
    }
    return total;
  }

  public computeOngoingCosts(
    buildings: Building[],
    hiredWorkers: Worker[],
    deltaMs: number
  ): number {
    const msPerDay = this.time.msPerHour * this.time.hoursPerDay;
    const maintenancePerDay = buildings.reduce((acc, b) => {
      return acc + (b.type.maintenancePerDay ?? 0) * this.settings.maintenance.bufferMultiplier;
    }, 0);
    this.cachedMaintenancePerDay = maintenancePerDay;

    const salariesPerDay = hiredWorkers.reduce((acc, worker) => {
      return acc + (worker.salaryPerDay ?? 0);
    }, 0);
    this.cachedSalariesPerDay = salariesPerDay;

    const dailyTotal = maintenancePerDay + salariesPerDay;
    if (dailyTotal <= 0 || msPerDay <= 0) return 0;

    const maintenancePortion = Math.floor((maintenancePerDay * deltaMs) / msPerDay);
    const salaryPortion = Math.floor((salariesPerDay * deltaMs) / msPerDay);
    const rounded = maintenancePortion + salaryPortion;

    if (maintenancePortion > 0) {
      this.recordExpense(maintenancePortion, 'maintenance');
    }
    if (salaryPortion > 0) {
      this.recordExpense(salaryPortion, 'salaries');
    }

    return rounded;
  }

  public processMonthEnd(): number {
    const baseTaxable = Math.max(0, this.monthIncome - this.monthExpenses);
    const { taxes } = this.settings;
    const baseTax = Math.max(taxes.minimum, Math.floor(baseTaxable * taxes.rate));

    const progressiveComponent =
      baseTaxable > taxes.progressiveThreshold
        ? Math.floor((baseTaxable - taxes.progressiveThreshold) * taxes.progressiveRate)
        : 0;

    const tax = baseTax + progressiveComponent;
    this.recordExpense(tax, 'taxes');
    this.lastMonthlyTax = tax;
    this.resetMonthlyTracking();
    return tax;
  }

  public snapshot(currentDay: number = 1): EconomySnapshot {
    const projectedTaxable = Math.max(0, this.monthIncome - this.monthExpenses);
    const projectedTax = Math.max(
      this.settings.taxes.minimum,
      Math.floor(projectedTaxable * this.settings.taxes.rate)
    );

    const daysElapsed = Math.max(1, currentDay);
    const daysRemaining = Math.max(0, this.time.daysPerMonth - currentDay);
    const net = this.monthIncome - this.monthExpenses;
    const averageDailyNet = net / daysElapsed;
    const projectedIncome =
      this.monthIncome + (this.monthIncome / daysElapsed) * daysRemaining;
    const projectedExpenses =
      this.monthExpenses + (this.monthExpenses / daysElapsed) * daysRemaining;

    return {
      dailyMaintenance: this.cachedMaintenancePerDay,
      dailySalaries: this.cachedSalariesPerDay,
      dailyPassiveIncome: this.cachedPassiveIncomePerDay,
      lastDailyIncome: this.lastDailyIncome,
      lastMonthlyTax: this.lastMonthlyTax,
      monthIncome: this.monthIncome,
      monthExpenses: this.monthExpenses,
      projectedTax,
      incomeByCategory: { ...this.incomeByCategory },
      expenseByCategory: { ...this.expenseByCategory },
      projection: {
        daysElapsed,
        daysRemaining,
        projectedIncome,
        projectedExpenses,
        projectedNet: projectedIncome - projectedExpenses,
        averageDailyNet,
      },
    };
  }

  public hydrate(snapshot: EconomySnapshot) {
    this.cachedMaintenancePerDay = snapshot.dailyMaintenance;
    this.cachedSalariesPerDay = snapshot.dailySalaries;
    this.cachedPassiveIncomePerDay = snapshot.dailyPassiveIncome;
    this.lastDailyIncome = snapshot.lastDailyIncome;
    this.lastMonthlyTax = snapshot.lastMonthlyTax;
    this.monthIncome = snapshot.monthIncome;
    this.monthExpenses = snapshot.monthExpenses;
    this.incomeByCategory = {
      ...this.createIncomeLedger(),
      ...(snapshot.incomeByCategory ?? {}),
    };
    this.expenseByCategory = {
      ...this.createExpenseLedger(),
      ...(snapshot.expenseByCategory ?? {}),
    };
  }

  private createIncomeLedger(): Record<IncomeCategory, number> {
    return INCOME_CATEGORIES.reduce(
      (acc, category) => ({ ...acc, [category]: 0 }),
      {} as Record<IncomeCategory, number>
    );
  }

  private createExpenseLedger(): Record<ExpenseCategory, number> {
    return EXPENSE_CATEGORIES.reduce(
      (acc, category) => ({ ...acc, [category]: 0 }),
      {} as Record<ExpenseCategory, number>
    );
  }

  private resetMonthlyTracking() {
    this.monthIncome = 0;
    this.monthExpenses = 0;
    this.incomeByCategory = this.createIncomeLedger();
    this.expenseByCategory = this.createExpenseLedger();
  }
}
