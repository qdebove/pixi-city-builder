import { Container, Graphics, IDestroyOptions, Point, Text, Ticker } from 'pixi.js';
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
  private visitorQueue = 0;
  private lastServiceSatisfaction = 0.65;

  private readonly unlockedPassives: PassiveInstance[];
  private staffMembers: Worker[] = [];
  private visitors: Visitor[] = [];

  private visual: Graphics;
  private selectionRing: Graphics;
  private badge?: Container;
  private badgeBg?: Graphics;
  private badgeLabel?: Text;

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
      queueLength: 0,
      lastServiceSatisfaction: this.lastServiceSatisfaction,
    };

    this.position.set(
      (gx + this.widthCells / 2) * CELL_SIZE,
      (gy + this.heightCells / 2) * CELL_SIZE
    );

    this.visual = new Graphics();
    this.selectionRing = new Graphics();
    this.badge = new Container();
    this.badgeBg = new Graphics();
    this.badgeLabel = new Text({
      text: '',
      style: {
        fontSize: 11,
        fill: 0xffffff,
        fontWeight: '700',
      },
    });
    this.badge.addChild(this.badgeBg, this.badgeLabel);
    this.badge.visible = false;
    this.addChild(this.visual, this.selectionRing, this.badge);

    this.drawVisual();
    this.drawSelectionRing();
    this.updateBadge();

    this.eventMode = 'static';
    this.on('pointerover', () => {
      this.visual.alpha = 0.85;
      if (this.badge) {
        this.badge.visible = true;
        this.updateBadge();
      }
    });
    this.on('pointerout', () => {
      this.visual.alpha = 1;
      if (this.badge) {
        this.badge.visible = false;
      }
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
    if (newState.queueLength !== undefined) {
      this.visitorQueue = Math.max(0, newState.queueLength);
    }
    if (newState.lastServiceSatisfaction !== undefined) {
      this.lastServiceSatisfaction = newState.lastServiceSatisfaction;
    }
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
    this.updateBadge();
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

    this.visitorQueue = Math.max(0, payload.state.queueLength ?? 0);
    this.lastServiceSatisfaction = payload.state.lastServiceSatisfaction ?? this.lastServiceSatisfaction;

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
      queueLength: this.visitorQueue,
      lastServiceSatisfaction: this.lastServiceSatisfaction,
    };
    this.districtId = payload.state.districtId;
    this.staffMembers = staffProfiles;
    this.visitors = visitorProfiles.slice(0, visitorCount);
    const interval = Math.max(payload.state.productionIntervalMs, 0);
    const savedProgress = Math.max(0, payload.state.incomeProgressMs ?? 0);
    this.incomeProgressMs = Math.min(savedProgress, interval);
    this.drawVisual();
    this.updateBadge();
  }

  public setSelected(isSelected: boolean) {
    this.selectionRing.visible = isSelected;
    this.zIndex = isSelected ? 100 : 1;
  }

  public getIncome(): number {
    return this.getIncomeWithoutPassives();
  }

  public addOccupant(
    role: PersonRole,
    profile?: Worker | Visitor
  ): 'entered' | 'queued' | 'rejected' {
    if (role === 'visitor' && !this.hasCapacityFor(role)) {
      const queued = this.enqueueVisitor(profile);
      return queued ? 'queued' : 'rejected';
    }

    if (!this.hasCapacityFor(role)) return 'rejected';

    this.rememberProfile(role, profile);

    const nextOccupants = {
      ...this.state.occupants,
      [role]: (this.state.occupants[role] || 0) + 1,
    } as Record<PersonRole, number>;

    this.state = {
      ...this.state,
      occupants: nextOccupants,
      currentOccupants: this.computeTotalOccupants(nextOccupants),
      queueLength: this.visitorQueue,
      lastServiceSatisfaction: this.lastServiceSatisfaction,
    };

    this.drawVisual();
    this.updateBadge();
    return 'entered';
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

  public getQueueLength(): number {
    return this.visitorQueue;
  }

  public getQueueCapacity(): number {
    return Math.max(0, this.type.queueMax ?? 0);
  }

  public getQueueRatio(): number {
    const capacity = this.getQueueCapacity();
    if (capacity <= 0) return 0;
    return Math.min(1, this.visitorQueue / capacity);
  }

  public getLastServiceSatisfaction(): number {
    return this.lastServiceSatisfaction;
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

  private enqueueVisitor(profile?: Worker | Visitor): boolean {
    if (!this.hasQueueSpace()) return false;
    if (profile) {
      this.rememberProfile('visitor', profile);
    }
    this.visitorQueue += 1;
    this.state.queueLength = this.visitorQueue;
    this.updateBadge();
    return true;
  }

  private hasQueueSpace(): boolean {
    const maxQueue = this.getQueueCapacity();
    if (maxQueue <= 0) return false;
    return this.visitorQueue < maxQueue;
  }

  public canAcceptVisitor(): boolean {
    if (this.type.capacity <= 0) return false;
    return this.hasCapacityFor('visitor') || this.hasQueueSpace();
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

  public completeServiceCycle(): {
    servedVisitors: number;
    queuedRemaining: number;
    satisfaction: number;
  } {
    if (this.type.isRoad) {
      return {
        servedVisitors: 0,
        queuedRemaining: this.visitorQueue,
        satisfaction: this.lastServiceSatisfaction,
      };
    }

    const capacity = this.getCapacityForRole('visitor');
    const currentVisitors = Math.min(this.state.occupants.visitor ?? 0, capacity);
    const queueCapacity = Math.max(1, this.getQueueCapacity() || 1);
    const waitPenalty =
      this.visitorQueue > 0 ? Math.min(0.45, (this.visitorQueue / queueCapacity) * 0.5) : 0;
    const quality = this.type.serviceQuality ?? 0.7;
    const comfort = this.type.comfort ?? 0.7;

    this.lastServiceSatisfaction = this.clamp01(0.35 + quality * 0.4 + comfort * 0.25 - waitPenalty);
    this.state.lastServiceSatisfaction = this.lastServiceSatisfaction;

    const servedVisitors = currentVisitors;
    const admittedFromQueue = Math.min(this.visitorQueue, capacity);
    this.visitorQueue = Math.max(0, this.visitorQueue - admittedFromQueue);

    const nextOccupants = {
      ...this.state.occupants,
      visitor: admittedFromQueue,
    };
    this.state = {
      ...this.state,
      occupants: nextOccupants,
      currentOccupants: this.computeTotalOccupants(nextOccupants),
      queueLength: this.visitorQueue,
      lastServiceSatisfaction: this.lastServiceSatisfaction,
    };
    this.updateBadge();

    return {
      servedVisitors,
      queuedRemaining: this.visitorQueue,
      satisfaction: this.lastServiceSatisfaction,
    };
  }

  private clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
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

  private updateBadge() {
    if (!this.badge || !this.badgeBg || !this.badgeLabel) return;

    const capacity = this.getCapacityForRole('visitor');
    const queueCap = this.getQueueCapacity();
    if (capacity <= 0 && queueCap <= 0) {
      this.badge.visible = false;
      return;
    }

    const occRatio = capacity > 0 ? this.getOccupancyRatioFor('visitor') : 0;
    const queueRatio = queueCap > 0 ? this.getQueueRatio() : 0;
    const severity = Math.max(occRatio, queueRatio);

    const color =
      severity < 0.7 ? 0x22c55e : severity < 1 ? 0xf59e0b : 0xef4444;

    const label = `Cap. ${this.state.occupants.visitor}/${capacity} • File ${this.visitorQueue}/${queueCap || 0}`;
    this.badgeLabel.text = label;
    this.badgeLabel.style.fill = color;

    const padding = 6;
    const { width, height } = this.badgeLabel;
    this.badgeBg.clear();
    this.badgeBg
      .roundRect(-padding, -padding, width + padding * 2, height + padding * 2, 6)
      .fill({ color: 0x0f172a, alpha: 0.88 })
      .stroke({ width: 2, color, alpha: 0.9 });

    this.badgeLabel.position.set(0, 0);
    this.badge.position.set(-width / 2, -this.heightCells * CELL_SIZE / 2 - height - 10);
  }

  public destroy(options?: boolean | IDestroyOptions) {
    Ticker.shared.remove(this.updateAnim, this);
    this.badgeLabel?.destroy();
    this.badgeBg?.destroy();
    this.badge?.destroy();
    super.destroy(options);
  }
}
