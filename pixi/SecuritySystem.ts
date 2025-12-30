import { ReputationSnapshot } from './ReputationSystem';

export type SecuritySnapshot = {
  score: number;
  guardCoverage: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export class SecuritySystem {
  private score = 42;
  private guardCoverage = 0;

  public update(params: {
    roamingGuardCount: number;
    stationedGuards: number;
    movingPeople: number;
    reputation: ReputationSnapshot;
    deltaMs: number;
  }): SecuritySnapshot {
    const guardFactor =
      params.roamingGuardCount * 4 + params.stationedGuards * 2.5;
    const pressureFactor = params.reputation.regulatoryPressure * 0.35;
    const crowdPenalty = Math.max(0, params.movingPeople - 6) * 0.45;

    const drift =
      (guardFactor - pressureFactor - crowdPenalty) * (params.deltaMs / 1000) *
      0.08;

    this.score = clamp(this.score + drift, 0, 100);

    const guardCoverage = clamp(
      params.roamingGuardCount * 0.6 + params.stationedGuards * 0.4,
      0,
      10
    );

    this.guardCoverage = guardCoverage;

    return { score: this.score, guardCoverage };
  }

  public snapshot(): SecuritySnapshot {
    return { score: this.score, guardCoverage: this.guardCoverage };
  }

  public hydrate(snapshot: SecuritySnapshot) {
    this.score = clamp(snapshot.score, 0, 100);
    this.guardCoverage = clamp(snapshot.guardCoverage, 0, 10);
  }
}
