import { Container, Graphics, Point, Ticker } from 'pixi.js';
import {
  BuildingState,
  BuildingType,
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
      currentOccupants: 1,
      isAutoClickerUnlocked: false,
      isAutoClickerActive: false,
      autoClickerInterval: 2000,
      autoClickerLevel: 0,
    };

    // centre exact de la cellule
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

    // routes : pas d'indicateurs de niveau
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
    this.drawVisual();
  }

  public setSelected(isSelected: boolean) {
    this.selectionRing.visible = isSelected;
    this.zIndex = isSelected ? 100 : 1;
  }

  public getIncome(): number {
    return calculateIncome(this.type, this.state.level);
  }

  public getCenterGlobalPosition(): Point {
    return this.toGlobal(new Point(0, 0));
  }

  public pulse() {
    this.scale.set(1.15);
  }

  private updateAnim(ticker: Ticker) {
    if (this.scale.x > 1) {
      const speed = 0.15 * ticker.deltaTime;
      const newScale = this.scale.x - speed;
      if (newScale <= 1) {
        this.scale.set(1);
      } else {
        this.scale.set(newScale);
      }
    }
  }

  public destroy(options?: any) {
    Ticker.shared.remove(this.updateAnim, this);
    super.destroy(options);
  }
}
