export interface TickContext {
  /** logical tick index (monotonic) */
  tick: number;
  /** elapsed time since start of simulation, in milliseconds */
  nowMs: number;
  /** duration of this tick in milliseconds */
  deltaMs: number;
}

export class SimulationClock {
  private readonly tickDurationMs: number;
  private readonly maxCatchUpTicks: number;
  private accumulatedMs = 0;
  private currentTick = 0;
  private nowMs = 0;
  private readonly onTick: (ctx: TickContext) => void;

  constructor(options: {
    tickDurationMs: number;
    maxCatchUpTicks?: number;
    onTick: (ctx: TickContext) => void;
  }) {
    this.tickDurationMs = options.tickDurationMs;
    this.maxCatchUpTicks = options.maxCatchUpTicks ?? 5;
    this.onTick = options.onTick;
  }

  /**
   * Accumulates real time and emits discrete ticks using a fixed timestep.
   * When paused, call with `paused = true` to drop accumulation entirely.
   */
  public step(frameDeltaMs: number, paused: boolean = false) {
    if (paused) return;

    this.accumulatedMs += frameDeltaMs;

    let ticksToProcess = Math.floor(this.accumulatedMs / this.tickDurationMs);
    if (ticksToProcess <= 0) return;

    if (ticksToProcess > this.maxCatchUpTicks) {
      // Avoid spiral of death by clamping catch-up work
      this.accumulatedMs = this.tickDurationMs * this.maxCatchUpTicks;
      ticksToProcess = this.maxCatchUpTicks;
    }

    while (ticksToProcess > 0) {
      this.accumulatedMs -= this.tickDurationMs;
      this.currentTick += 1;
      this.nowMs += this.tickDurationMs;

      this.onTick({
        tick: this.currentTick,
        nowMs: this.nowMs,
        deltaMs: this.tickDurationMs,
      });

      ticksToProcess -= 1;
    }
  }

  public reset() {
    this.accumulatedMs = 0;
    this.currentTick = 0;
    this.nowMs = 0;
  }

  public snapshotState() {
    return { tick: this.currentTick, nowMs: this.nowMs };
  }

  public hydrate(state: { tick: number; nowMs: number }) {
    this.currentTick = Math.max(0, state.tick);
    this.nowMs = Math.max(0, state.nowMs);
    this.accumulatedMs = 0;
  }
}
