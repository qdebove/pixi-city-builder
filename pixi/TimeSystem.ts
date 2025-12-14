export interface TimeSettings {
  msPerHour: number;
  hoursPerDay: number;
  daysPerMonth: number;
  startDay?: number;
  startMonth?: number;
  startYear?: number;
}

export interface TimeSnapshot {
  hour: number;
  day: number;
  month: number;
  year: number;
  elapsedMs: number;
}

export interface TimeAdvanceResult {
  hoursAdvanced: number;
  daysAdvanced: number;
  monthsAdvanced: number;
}

/**
 * Tracks logical time progression (hour/day/month) using accumulated simulation deltaMs.
 * Deterministic and independent from render frame-rate.
 */
export class TimeSystem {
  private readonly settings: TimeSettings;
  private carryMs = 0;
  private snapshot: TimeSnapshot;

  constructor(settings: TimeSettings) {
    this.settings = settings;
    this.snapshot = {
      hour: 0,
      day: settings.startDay ?? 1,
      month: settings.startMonth ?? 1,
      year: settings.startYear ?? 1,
      elapsedMs: 0,
    };
  }

  public advance(deltaMs: number): TimeAdvanceResult {
    this.carryMs += deltaMs;

    let hoursAdvanced = 0;
    let daysAdvanced = 0;
    let monthsAdvanced = 0;

    while (this.carryMs >= this.settings.msPerHour) {
      this.carryMs -= this.settings.msPerHour;
      this.snapshot.elapsedMs += this.settings.msPerHour;

      hoursAdvanced += 1;
      this.snapshot.hour += 1;

      if (this.snapshot.hour >= this.settings.hoursPerDay) {
        this.snapshot.hour = 0;
        daysAdvanced += 1;
        this.snapshot.day += 1;
      }

      if (this.snapshot.day > this.settings.daysPerMonth) {
        this.snapshot.day = 1;
        monthsAdvanced += 1;
        this.snapshot.month += 1;

        if (this.snapshot.month > 12) {
          this.snapshot.month = 1;
          this.snapshot.year += 1;
        }
      }
    }

    return { hoursAdvanced, daysAdvanced, monthsAdvanced };
  }

  public snapshotState(): TimeSnapshot {
    return { ...this.snapshot, elapsedMs: this.snapshot.elapsedMs + this.carryMs };
  }

  public reset() {
    this.carryMs = 0;
    this.snapshot = {
      hour: 0,
      day: this.settings.startDay ?? 1,
      month: this.settings.startMonth ?? 1,
      year: this.settings.startYear ?? 1,
      elapsedMs: 0,
    };
  }
}
