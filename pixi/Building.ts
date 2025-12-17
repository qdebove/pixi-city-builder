import { Container, Graphics, IDestroyOptions, Point, Ticker } from 'pixi.js';
import { PassiveInstance, Visitor, Worker } from '../types/data-contract';
import {
  BuildingState,
  BuildingType,
  PersonRole,
  calculateIncome,
  CELL_SIZE,
} from '../types/types';
import { BUILDING_PASSIVES_BY_TYPE } from './data/game-model';

export class Building extends Container {
  public gridX: number;
  public gridY: number;
  public type: BuildingType;
  public readonly widthCells: number;
  public readonly heightCells: number;
  public state: BuildingState;
  public districtId?: string;
  private incomeProgressMs = 0;

  private readonly unlockedPassives: PassiveInstance[];
  private staffMembers: Worker[] = [];
  private visitors: Visitor[] = [];

  private visual: Graphics;
  private selectionRing: Graphics;

  constructor(gx: number, gy: number, type: BuildingType) {
    super();
    this.gridX = gx;
    this.gridY = gy;
    this.type = type;
    this.widthCells = Math.max(1, type.width);
    this.heightCells = Math.max(1, type.height);

    this.unlockedPassives = BUILDING_PASSIVES_BY_TYPE[type.id] ?? [];

    this.state = {
      instanceId: crypto.randomUUID(),
      typeId: type.id,
      level: 1,
      currentHealth: type.baseHealth,
      currentOccupants: 0,
      occupants: { visitor: 0, staff: 0 },
      productionIntervalMs: type.baseIntervalMs || 2000, // ✅ propre à chaque type
      incomeProgressMs: 0,
    };

    this.position.set(
      (gx + this.widthCells / 2) * CELL_SIZE,
      (gy + this.heightCells / 2) * CELL_SIZE
    );

    this.visual = new Graphics();
    this.selectionRing = new Graphics();
    this.addChild(this.visual, this.selectionRing);

    this.drawVisual();
    this.drawSelectionRing();

    this.eventMode = 'static';
    this.on('pointerover', () => {
      this.visual.alpha = 0.85;
    });
    this.on('pointerout', () => {
      this.visual.alpha = 1;
    });

    Ticker.shared.add(this.updateAnim, this);
  }

  public getUnlockedPassives(): PassiveInstance[] {
    return [...this.unlockedPassives];
  }

  public getStaffMembers(): Worker[] {
    return [...this.staffMembers];
  }

  public getVisitors(): Visitor[] {
    return [...this.visitors];
  }

  public getBaseIncome(): number {
    return calculateIncome(this.type, this.state.level);
  }

  public getBaseIntervalMs(): number {
    return this.type.baseIntervalMs || this.state.productionIntervalMs;
  }

  public getIncomeWithoutPassives(): number {
    const base = this.getBaseIncome();
    return Math.floor(base * this.getOccupancyMultiplier());
  }

  private getOccupancyMultiplier(): number {
    if (this.type.capacity <= 0 && this.type.staffCapacity <= 0) return 1;

    const visitorCount = this.state.occupants.visitor || 0;
    const staffCount = this.state.occupants.staff || 0;

    const visitorRatio =
      this.type.capacity > 0
        ? Math.min(1, visitorCount / this.type.capacity)
        : 0;

    const staffCapacity = this.getStaffCapacity();
    const staffRatio =
      staffCapacity > 0 ? Math.min(1, staffCount / staffCapacity) : 0;
    const staffBoost = 1 + staffRatio * this.type.staffEfficiency;

    const baseline = this.type.category === 'housing' ? 0 : 1;

    return (baseline + visitorRatio) * staffBoost;
  }

  private drawVisual() {
    this.visual.clear();

    const widthPx = this.widthCells * CELL_SIZE - 4;
    const heightPx = this.heightCells * CELL_SIZE - 4;
    const offsetX = -widthPx / 2;
    const offsetY = -heightPx / 2;

    this.visual
      .rect(offsetX, offsetY, widthPx, heightPx)
      .fill(this.type.color)
      .stroke({ width: 2, color: 0xffffff });

    if (this.type.isRoad) return;

    const dotsStart = offsetX + 6;
    for (let i = 0; i < this.state.level && i < 5; i++) {
      this.visual
        .circle(dotsStart + i * 8, offsetY + 6, 2)
        .fill(0xffffff);
    }
  }

  private drawSelectionRing() {
    this.selectionRing.clear();
    const widthPx = this.widthCells * CELL_SIZE;
    const heightPx = this.heightCells * CELL_SIZE;
    this.selectionRing
      .rect(-widthPx / 2 - 4, -heightPx / 2 - 4, widthPx + 8, heightPx + 8)
      .stroke({ width: 4, color: 0xffb700, alpha: 0.8 });
    this.selectionRing.visible = false;
  }

  public updateState(newState: Partial<BuildingState>) {
    this.state = { ...this.state, ...newState };
    this.state.currentOccupants = this.getTotalOccupants();

    if (newState.productionIntervalMs !== undefined) {
      this.incomeProgressMs = Math.min(
        this.incomeProgressMs,
        Math.max(newState.productionIntervalMs, 0)
      );
    }

    if (newState.incomeProgressMs !== undefined) {
      this.incomeProgressMs = Math.max(
        0,
        Math.min(newState.incomeProgressMs, Math.max(this.state.productionIntervalMs, 0))
      );
    }

    this.drawVisual();
  }

  public setDistrict(districtId: string | undefined) {
    this.districtId = districtId;
    this.state.districtId = districtId;
  }

  public hydrate(payload: {
    state: BuildingState;
    staffProfiles?: Worker[];
    visitorProfiles?: Visitor[];
  }) {
    const staffProfiles = [...(payload.staffProfiles ?? [])];
    const visitorProfiles = [...(payload.visitorProfiles ?? [])];
    const staffCount = staffProfiles.length;
    const visitorCount = Math.max(
      payload.state.occupants.visitor ?? visitorProfiles.length,
      visitorProfiles.length
    );

    this.state = {
      ...payload.state,
      occupants: {
        visitor: visitorCount,
        staff: staffCount,
      },
      currentOccupants: this.computeTotalOccupants({
        visitor: visitorCount,
        staff: staffCount,
      }),
    };
    this.districtId = payload.state.districtId;
    this.staffMembers = staffProfiles;
    this.visitors = visitorProfiles.slice(0, visitorCount);
    const interval = Math.max(payload.state.productionIntervalMs, 0);
    const savedProgress = Math.max(0, payload.state.incomeProgressMs ?? 0);
    this.incomeProgressMs = Math.min(savedProgress, interval);
    this.drawVisual();
  }

  public setSelected(isSelected: boolean) {
    this.selectionRing.visible = isSelected;
    this.zIndex = isSelected ? 100 : 1;
  }

  public getIncome(): number {
    return this.getIncomeWithoutPassives();
  }

  public addOccupant(role: PersonRole, profile?: Worker | Visitor) {
    if (!this.hasCapacityFor(role)) return;

    this.rememberProfile(role, profile);

    const nextOccupants = {
      ...this.state.occupants,
      [role]: (this.state.occupants[role] || 0) + 1,
    } as Record<PersonRole, number>;

    this.state = {
      ...this.state,
      occupants: nextOccupants,
      currentOccupants: this.computeTotalOccupants(nextOccupants),
    };

    this.drawVisual();
  }

  public getOccupantsByRole(): Record<PersonRole, number> {
    return { ...this.state.occupants };
  }

  public hasCapacity(): boolean {
    return (
      this.hasCapacityFor('visitor') ||
      this.hasCapacityFor('staff')
    );
  }

  public hasCapacityFor(role: PersonRole): boolean {
    if (role === 'visitor') {
      if (this.type.capacity <= 0) return false;
      return this.state.occupants.visitor < this.type.capacity;
    }

    const staffCapacity = this.getStaffCapacity();
    if (staffCapacity <= 0) return false;
    return this.state.occupants.staff < staffCapacity;
  }

  public getCapacityForRole(role: PersonRole): number {
    return role === 'visitor' ? this.type.capacity : this.getStaffCapacity();
  }

  public getOccupancyRatioFor(role: PersonRole): number {
    const capacity = this.getCapacityForRole(role);
    if (capacity <= 0) return 0;

    const occupants = this.state.occupants[role] ?? 0;
    return Math.min(1, occupants / capacity);
  }

  public getAvailableSlotsFor(role: PersonRole): number {
    const capacity = this.getCapacityForRole(role);
    const occupants = this.state.occupants[role] ?? 0;
    return Math.max(0, capacity - occupants);
  }

  public getTotalOccupants(): number {
    return this.computeTotalOccupants(this.state.occupants);
  }

  public getStaffCapacity(): number {
    return this.type.staffCapacity;
  }

  public getStaffNeedScore(): number {
    const cap = this.getStaffCapacity();
    if (cap <= 0) return 0;

    const missing = cap - this.state.occupants.staff;
    if (missing <= 0) return 0;

    return missing / cap;
  }

  private rememberProfile(role: PersonRole, profile?: Worker | Visitor) {
    if (!profile) return;

    if (role === 'staff' && 'jobs' in profile) {
      this.staffMembers.push(profile as Worker);
    }

    if (role === 'visitor' && 'preferences' in profile) {
      this.visitors.push(profile as Visitor);
    }
  }

  private computeTotalOccupants(
    occupants: Record<PersonRole, number>
  ): number {
    return (occupants.visitor || 0) + (occupants.staff || 0);
  }

  public getCenterGlobalPosition(): Point {
    return this.toGlobal(new Point(0, 0));
  }

  public pulse() {
    // plus de rebond pour la production passive
  }

  private updateAnim() {
    // laissé vide pour de futures animations éventuelles
  }

  public accumulateIncomeProgress(deltaMs: number): number {
    if (this.type.isRoad) return 0;

    const interval = Math.max(this.state.productionIntervalMs, 50);
    this.incomeProgressMs += deltaMs;

    const completedCycles = Math.floor(this.incomeProgressMs / interval);
    if (completedCycles > 0) {
      this.incomeProgressMs -= completedCycles * interval;
    }

    return completedCycles;
  }

  public getIncomeProgressMs(): number {
    return this.incomeProgressMs;
  }

  public destroy(options?: boolean | IDestroyOptions) {
    Ticker.shared.remove(this.updateAnim, this);
    super.destroy(options);
  }
}
