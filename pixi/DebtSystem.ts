export interface DebtSettings {
  startingBalance: number;
  monthlyGrowthRate: number;
  minimumPayment: number;
  paymentRatio: number;
}

export interface DebtSnapshot {
  balance: number;
  lastPayment: number;
  totalPaid: number;
  monthIndex: number;
}

/**
 * Handles deterministic debt growth and mandatory payments tied to the simulation calendar.
 */
export class DebtSystem {
  private readonly settings: DebtSettings;
  private snapshot: DebtSnapshot;

  constructor(settings: DebtSettings) {
    this.settings = settings;
    this.snapshot = {
      balance: settings.startingBalance,
      lastPayment: 0,
      totalPaid: 0,
      monthIndex: 0,
    };
  }

  /**
   * Applies monthly interest then returns the mandatory payment for this month.
   */
  public processNewMonth(): number {
    this.snapshot.balance = Math.ceil(
      this.snapshot.balance * (1 + this.settings.monthlyGrowthRate)
    );

    const paymentDue = Math.max(
      this.settings.minimumPayment,
      Math.ceil(this.snapshot.balance * this.settings.paymentRatio)
    );

    this.snapshot.balance = Math.max(0, this.snapshot.balance - paymentDue);
    this.snapshot.totalPaid += paymentDue;
    this.snapshot.lastPayment = paymentDue;
    this.snapshot.monthIndex += 1;

    return paymentDue;
  }

  public snapshotState(): DebtSnapshot {
    return { ...this.snapshot };
  }
}
