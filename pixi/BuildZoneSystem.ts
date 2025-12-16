import { GRID_SIZE } from '@/types/types';
import { BuildZoneSettings } from './data/map-settings';

export interface BuildZoneSnapshot {
  bounds: { x: number; y: number; width: number; height: number };
  nextCost: number;
  expansionsPurchased: number;
  maxSize: number;
}

export class BuildZoneSystem {
  private bounds: { x: number; y: number; width: number; height: number };
  private expansionsPurchased = 0;

  constructor(private readonly settings: BuildZoneSettings) {
    const clampedInitial = Math.min(
      settings.initialSize,
      settings.maxSize,
      GRID_SIZE
    );
    const start = Math.floor((GRID_SIZE - clampedInitial) / 2);
    this.bounds = {
      x: start,
      y: start,
      width: clampedInitial,
      height: clampedInitial,
    };
  }

  public canBuildAt(
    gridX: number,
    gridY: number,
    width: number,
    height: number
  ): boolean {
    return (
      gridX >= this.bounds.x &&
      gridY >= this.bounds.y &&
      gridX + width <= this.bounds.x + this.bounds.width &&
      gridY + height <= this.bounds.y + this.bounds.height
    );
  }

  public getBounds() {
    return { ...this.bounds };
  }

  public getNextExpansionCost(): number {
    const growthFactor = Math.pow(
      this.settings.costGrowth,
      this.expansionsPurchased
    );
    return Math.floor(this.settings.baseCost * growthFactor);
  }

  public tryExpand(): boolean {
    if (
      this.bounds.width >= this.settings.maxSize ||
      this.bounds.height >= this.settings.maxSize
    ) {
      return false;
    }

    const nextWidth = Math.min(
      this.settings.maxSize,
      this.bounds.width + this.settings.expansionStep
    );
    const nextHeight = Math.min(
      this.settings.maxSize,
      this.bounds.height + this.settings.expansionStep
    );

    const newX = Math.max(0, Math.floor((GRID_SIZE - nextWidth) / 2));
    const newY = Math.max(0, Math.floor((GRID_SIZE - nextHeight) / 2));

    this.bounds = { x: newX, y: newY, width: nextWidth, height: nextHeight };
    this.expansionsPurchased += 1;
    return true;
  }

  public snapshot(): BuildZoneSnapshot {
    return {
      bounds: this.getBounds(),
      nextCost: this.getNextExpansionCost(),
      expansionsPurchased: this.expansionsPurchased,
      maxSize: this.settings.maxSize,
    };
  }
}
