import { Container, Graphics, IDestroyOptions, Point, Ticker } from 'pixi.js';
import {
  BuildingState,
  BuildingType,
  PersonRole,
  calculateIncome,
  CELL_SIZE,
} from '../types/types';

export class Building extends Container {
  public gridX: number;
  public gridY: number;
  public type: BuildingType;
  public state: BuildingState;
  public lastAutoClickTime: number = 0;

  private visual: Graphics;
  private selectionRing: Graphics;

  constructor(gx: number, gy: number, type: BuildingType) {
    super();
    this.gridX = gx;
    this.gridY = gy;
    this.type = type;

    this.state = {
      instanceId: crypto.randomUUID(),
      typeId: type.id,
      level: 1,
      currentHealth: type.baseHealth,
      currentOccupants: 0,
      occupants: { visitor: 0, staff: 0 },
      isAutoClickerUnlocked: true,
      isAutoClickerActive: true,
      autoClickerInterval: type.baseIntervalMs || 2000, // ✅ propre à chaque type
      autoClickerLevel: 1,
    };

    this.position.set(
      gx * CELL_SIZE + CELL_SIZE / 2,
      gy * CELL_SIZE + CELL_SIZE / 2
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

  private drawVisual() {
    this.visual.clear();

    const size = CELL_SIZE - 4;
    const offset = -size / 2;

    this.visual
      .rect(offset, offset, size, size)
      .fill(this.type.color)
      .stroke({ width: 2, color: 0xffffff });

    if (this.type.isRoad) return;

    const dotsStart = offset + 6;
    for (let i = 0; i < this.state.level && i < 5; i++) {
      this.visual.circle(dotsStart + i * 8, -offset - 6, 2).fill(0xffffff);
    }
  }

  private drawSelectionRing() {
    this.selectionRing.clear();
    this.selectionRing
      .rect(-CELL_SIZE / 2 - 4, -CELL_SIZE / 2 - 4, CELL_SIZE + 8, CELL_SIZE + 8)
      .stroke({ width: 4, color: 0xffb700, alpha: 0.8 });
    this.selectionRing.visible = false;
  }

  public updateState(newState: Partial<BuildingState>) {
    this.state = { ...this.state, ...newState };
    this.state.currentOccupants = this.getTotalOccupants();
    this.drawVisual();
  }

  public setSelected(isSelected: boolean) {
    this.selectionRing.visible = isSelected;
    this.zIndex = isSelected ? 100 : 1;
  }

  public getIncome(): number {
    const base = calculateIncome(this.type, this.state.level);
    if (this.type.capacity <= 0) return base;

    const ratio = Math.min(1, this.getTotalOccupants() / this.type.capacity);
    return Math.floor(base * (1 + ratio));
  }

  public addOccupant(role: PersonRole) {
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
    if (this.type.capacity <= 0) return false;
    return this.getTotalOccupants() < this.type.capacity;
  }

  public getTotalOccupants(): number {
    return this.computeTotalOccupants(this.state.occupants);
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

  public destroy(options?: boolean | IDestroyOptions) {
    Ticker.shared.remove(this.updateAnim, this);
    super.destroy(options);
  }
}
