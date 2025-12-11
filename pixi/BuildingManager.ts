import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
} from 'pixi.js';
import { BuildingType, CELL_SIZE, GRID_SIZE } from '../types/types';
import { Building } from './Building';

export class BuildingManager {
  private app: Application;
  private world: Container;

  private buildingsMap = new Map<string, Building>();

  private draggingType: BuildingType | null = null;
  private ghost: Graphics | null = null;

  constructor(app: Application, world: Container) {
    this.app = app;
    this.world = world;

    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
  }

  private key(gx: number, gy: number) {
    return `${gx},${gy}`;
  }

  public getBuildingAtGlobal(globalPos: Point): Building | null {
    const localPos = this.world.toLocal(globalPos);
    const gridX = Math.floor(localPos.x / CELL_SIZE);
    const gridY = Math.floor(localPos.y / CELL_SIZE);

    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
      return null;
    }

    return this.buildingsMap.get(this.key(gridX, gridY)) || null;
  }

  public tryPlaceBuildingAt(globalPos: Point, type: BuildingType): boolean {
    const localPos = this.world.toLocal(globalPos);
    const gridX = Math.floor(localPos.x / CELL_SIZE);
    const gridY = Math.floor(localPos.y / CELL_SIZE);
    const key = this.key(gridX, gridY);

    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE)
      return false;
    if (this.buildingsMap.has(key)) return false;

    const building = new Building(gridX, gridY, type);
    this.world.addChild(building);
    this.buildingsMap.set(key, building);

    if (this.ghost) {
      this.setDragMode(this.draggingType);
    }

    return true;
  }

  public setDragMode(type: BuildingType | null) {
    this.draggingType = type;

    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }

    if (type) {
      const ghost = new Graphics();
      ghost
        .rect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE)
        .fill({ color: type.color, alpha: 0.35 });
      ghost.alpha = 0.9;
      this.ghost = ghost;
      this.world.addChild(this.ghost);
      this.app.canvas.style.cursor = 'none';
    } else {
      this.app.canvas.style.cursor = 'default';
    }
  }

  public getDraggingMode(): BuildingType | null {
    return this.draggingType;
  }

  public getBuildings(): Building[] {
    return Array.from(this.buildingsMap.values());
  }

  // ---- Routes & graph helpers ----

  public getRoadBuildings(): Building[] {
    return this.getBuildings().filter((b) => b.type.isRoad);
  }

  public getRoadNeighbors(b: Building): Building[] {
    const res: Building[] = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const gx = b.gridX + dx;
      const gy = b.gridY + dy;
      const nb = this.buildingsMap.get(this.key(gx, gy));
      if (nb && nb.type.isRoad) {
        res.push(nb);
      }
    }
    return res;
  }
  
  public getRoadBuildingAt(gx: number, gy: number): Building | null {
    const b = this.buildingsMap.get(this.key(gx, gy));
    return b && b.type.isRoad ? b : null;
  }

  private onPointerMove(e: FederatedPointerEvent) {
    if (!this.draggingType || !this.ghost) return;

    const localPos = this.world.toLocal(e.global);
    const gridX = Math.floor(localPos.x / CELL_SIZE);
    const gridY = Math.floor(localPos.y / CELL_SIZE);

    const centerX = gridX * CELL_SIZE + CELL_SIZE / 2;
    const centerY = gridY * CELL_SIZE + CELL_SIZE / 2;

    this.ghost.position.set(centerX, centerY);

    const key = this.key(gridX, gridY);
    const isOccupied = this.buildingsMap.has(key);
    const outOfBounds =
      gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE;

    this.ghost.tint = isOccupied || outOfBounds ? 0xff0000 : 0xffffff;
  }
}
