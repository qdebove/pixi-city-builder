import { Building } from './Building';
import { EconomySettings } from './data/economy-settings';
import { TimeSettings } from './TimeSystem';
import { Worker } from '@/types/data-contract';
import { calculateIncome } from '@/types/types';

export interface EconomySnapshot {
  dailyMaintenance: number;
  dailySalaries: number;
  dailyPassiveIncome: number;
  lastDailyIncome: number;
  lastMonthlyTax: number;
  monthIncome: number;
  monthExpenses: number;
  projectedTax: number;
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

  constructor(settings: EconomySettings, time: TimeSettings) {
    this.settings = settings;
    this.time = time;
  }

  public recordIncome(amount: number) {
    if (amount <= 0) return;
    this.monthIncome += amount;
  }

  public recordExpense(amount: number) {
    if (amount <= 0) return;
    this.monthExpenses += amount;
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
      this.recordIncome(total);
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

    const proportionalCost = (dailyTotal * deltaMs) / msPerDay;
    const rounded = Math.floor(proportionalCost);
    this.recordExpense(rounded);
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
    this.monthExpenses += tax;
    this.lastMonthlyTax = tax;
    this.monthIncome = 0;
    this.monthExpenses = 0;
    return tax;
  }

  public snapshot(): EconomySnapshot {
    const projectedTaxable = Math.max(0, this.monthIncome - this.monthExpenses);
    const projectedTax = Math.max(
      this.settings.taxes.minimum,
      Math.floor(projectedTaxable * this.settings.taxes.rate)
    );

    return {
      dailyMaintenance: this.cachedMaintenancePerDay,
      dailySalaries: this.cachedSalariesPerDay,
      dailyPassiveIncome: this.cachedPassiveIncomePerDay,
      lastDailyIncome: this.lastDailyIncome,
      lastMonthlyTax: this.lastMonthlyTax,
      monthIncome: this.monthIncome,
      monthExpenses: this.monthExpenses,
      projectedTax,
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
  }
}
