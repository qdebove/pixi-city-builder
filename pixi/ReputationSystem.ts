import { PersonRole } from '../types/types';
import { Building } from './Building';

export interface ReputationSnapshot {
  local: number;
  premium: number;
  regulatoryPressure: number;
}

interface ReputationUpdateInput {
  buildings: Building[];
  movingPeople: Record<PersonRole, number>;
  deltaMs: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class ReputationSystem {
  private readonly driftPerSecond = 0.25;
  private state: ReputationSnapshot = {
    local: 52,
    premium: 48,
    regulatoryPressure: 20,
  };

  public update(input: ReputationUpdateInput): void {
    const seconds = input.deltaMs / 1000;
    if (seconds <= 0) return;

    const occupancyScore = this.computeOccupancyScore(input.buildings);
    const staffCoverage = this.computeStaffCoverage(input.buildings);
    const conditionScore = this.computeConditionScore(input.buildings);
    const movementScore = this.computeMovementPenalty(input.movingPeople);
    const premiumFriction = clamp(
      0.4 + (100 - this.state.premium) / 150,
      0.35,
      1
    );
    const regulationPenalty = clamp(
      this.state.regulatoryPressure / 80,
      0,
      1.15
    );

    const localDelta =
      (occupancyScore - 0.5) * this.driftPerSecond * seconds * 8 +
      (conditionScore - 0.5) * seconds * this.driftPerSecond * 4 -
      movementScore * seconds * this.driftPerSecond;

    const premiumDelta =
      ((conditionScore - 0.5) * this.driftPerSecond * seconds * 4.5 +
        (staffCoverage - 0.6) * this.driftPerSecond * seconds * 3 +
        (occupancyScore - 0.55) * this.driftPerSecond * seconds * 2) *
        premiumFriction -
      regulationPenalty * this.driftPerSecond * seconds * 3.5;

    const regulationDelta =
      movementScore * seconds * this.driftPerSecond * 6 -
      staffCoverage * this.driftPerSecond * seconds * 3;

    this.state = {
      local: clamp(this.state.local + localDelta, 0, 100),
      premium: clamp(this.state.premium + premiumDelta, 0, 100),
      regulatoryPressure: clamp(
        this.state.regulatoryPressure + regulationDelta,
        0,
        100
      ),
    };
  }

  public snapshot(): ReputationSnapshot {
    return { ...this.state };
  }

  public applyExternalDelta(delta: Partial<ReputationSnapshot>): void {
    const next: ReputationSnapshot = {
      local: this.state.local + (delta.local ?? 0),
      premium: this.state.premium + (delta.premium ?? 0),
      regulatoryPressure:
        this.state.regulatoryPressure + (delta.regulatoryPressure ?? 0),
    };

    this.state = {
      local: clamp(next.local, 0, 100),
      premium: clamp(next.premium, 0, 100),
      regulatoryPressure: clamp(next.regulatoryPressure, 0, 100),
    };
  }

  private computeOccupancyScore(buildings: Building[]): number {
    const occupancies = buildings
      .filter((b) => !b.type.isRoad)
      .map((b) => {
        const capacity = Math.max(1, b.type.capacity);
        return clamp(b.getTotalOccupants() / capacity, 0, 1);
      });

    if (occupancies.length === 0) return 0.5;
    const sum = occupancies.reduce((acc, value) => acc + value, 0);
    return sum / occupancies.length;
  }

  private computeStaffCoverage(buildings: Building[]): number {
    const staffRatios = buildings
      .filter((b) => !b.type.isRoad && b.getStaffCapacity() > 0)
      .map((b) =>
        clamp(b.getOccupantsByRole().staff / b.getStaffCapacity(), 0, 1)
      );

    if (staffRatios.length === 0) return 0.5;
    const sum = staffRatios.reduce((acc, value) => acc + value, 0);
    return sum / staffRatios.length;
  }

  private computeConditionScore(buildings: Building[]): number {
    const conditionRatios = buildings
      .filter((b) => !b.type.isRoad && b.type.baseHealth > 0)
      .map((b) => clamp(b.state.currentHealth / b.type.baseHealth, 0, 1));

    if (conditionRatios.length === 0) return 0.5;
    const sum = conditionRatios.reduce((acc, value) => acc + value, 0);
    return sum / conditionRatios.length;
  }

  private computeMovementPenalty(
    movingPeople: Record<PersonRole, number>
  ): number {
    const totalMoving = movingPeople.visitor + movingPeople.staff;
    if (totalMoving === 0) return 0;

    const visitorShare = totalMoving > 0 ? movingPeople.visitor / totalMoving : 0;
    const staffShare = totalMoving > 0 ? movingPeople.staff / totalMoving : 0;

    const congestion = clamp(totalMoving / 30, 0, 1);
    const visitorPressure = congestion * visitorShare;
    const staffSafety = congestion * (1 - staffShare);

    return clamp(visitorPressure + staffSafety * 0.5, 0, 1);
  }
}

