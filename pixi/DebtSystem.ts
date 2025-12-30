export interface DebtSettings {
  startingBalance: number;
  monthlyGrowthRate: number;
  minimumPayment: number;
  paymentRatio: number;
  dueDay?: number;
}

export interface DebtSnapshot {
  balance: number;
  lastPayment: number;
  totalPaid: number;
  monthIndex: number;
  paymentDue: number;
  dueDay: number;
  isPaidForMonth: boolean;
  missedPayments: number;
}

/**
 * Handles deterministic debt growth and mandatory payments tied to the simulation calendar.
 */
export class DebtSystem {
  private readonly settings: DebtSettings;
  private readonly defaultDueDay: number;
  private snapshot: DebtSnapshot;

  constructor(settings: DebtSettings, defaultDueDay: number) {
    this.settings = settings;
    this.defaultDueDay = defaultDueDay;
    this.snapshot = {
      balance: settings.startingBalance,
      lastPayment: 0,
      totalPaid: 0,
      monthIndex: 0,
      paymentDue: this.computePayment(settings.startingBalance),
      dueDay: defaultDueDay,
      isPaidForMonth: false,
      missedPayments: 0,
    };
  }

  /**
   * Applies monthly interest then schedules the mandatory payment for the next month.
   */
  public processNewMonth(dueDay: number): number {
    this.snapshot.balance = Math.ceil(
      this.snapshot.balance * (1 + this.settings.monthlyGrowthRate)
    );

    const paymentDue = this.computePayment(this.snapshot.balance);
    this.snapshot.paymentDue = paymentDue;
    this.snapshot.isPaidForMonth = false;
    this.snapshot.lastPayment = 0;
    this.snapshot.dueDay = dueDay;
    this.snapshot.monthIndex += 1;

    return paymentDue;
  }

  /**
   * Pays the scheduled debt if funds are available. Returns the amount actually consumed.
   */
  public payCurrentDebt(): number {
    if (this.snapshot.isPaidForMonth) return 0;
    if (this.snapshot.paymentDue <= 0) return 0;

    const payment = Math.min(this.snapshot.paymentDue, this.snapshot.balance);
    this.snapshot.balance = Math.max(0, this.snapshot.balance - payment);
    this.snapshot.totalPaid += payment;
    this.snapshot.lastPayment = payment;
    this.snapshot.isPaidForMonth = true;
    return payment;
  }

  public getOutstandingPayment(): number {
    return this.snapshot.isPaidForMonth ? 0 : this.snapshot.paymentDue;
  }

  public markMissedPayment(): void {
    if (!this.snapshot.isPaidForMonth && this.snapshot.paymentDue > 0) {
      this.snapshot.missedPayments += 1;
    }
  }

  public refreshDueDay(dueDay: number) {
    this.snapshot.dueDay = dueDay;
  }

  private computePayment(balance: number): number {
    return Math.max(
      this.settings.minimumPayment,
      Math.ceil(balance * this.settings.paymentRatio)
    );
  }

  public snapshotState(): DebtSnapshot {
    return { ...this.snapshot };
  }

  public hydrate(snapshot: DebtSnapshot) {
    this.snapshot = {
      balance: snapshot.balance,
      lastPayment: snapshot.lastPayment ?? 0,
      totalPaid: snapshot.totalPaid ?? 0,
      monthIndex: snapshot.monthIndex ?? 0,
      paymentDue:
        snapshot.paymentDue ?? this.computePayment(snapshot.balance ?? this.settings.startingBalance),
      dueDay: snapshot.dueDay ?? this.defaultDueDay,
      isPaidForMonth: snapshot.isPaidForMonth ?? false,
      missedPayments: snapshot.missedPayments ?? 0,
    };
  }
}
