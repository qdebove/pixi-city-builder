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
  private onBuildingPlaced?: (building: Building) => void;
  private placementValidator?: (
    gridX: number,
    gridY: number,
    type: BuildingType
  ) => boolean;

  constructor(app: Application, world: Container) {
    this.app = app;
    this.world = world;

    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
  }

  public setOnBuildingPlaced(callback: ((building: Building) => void) | undefined) {
    this.onBuildingPlaced = callback;
  }

  public setPlacementValidator(
    validator: ((gridX: number, gridY: number, type: BuildingType) => boolean) | null
  ) {
    this.placementValidator = validator ?? undefined;
  }

  private key(gx: number, gy: number) {
    return `${gx},${gy}`;
  }

  public getBuildingAtGlobal(globalPos: Point): Building | null {
    const localPos = this.world.toLocal(globalPos);
    const gridX = Math.floor(localPos.x / CELL_SIZE);
    const gridY = Math.floor(localPos.y / CELL_SIZE);

    if (!this.isWithinGrid(gridX, gridY)) {
      return null;
    }

    return this.buildingsMap.get(this.key(gridX, gridY)) || null;
  }

  public tryPlaceBuildingAt(globalPos: Point, type: BuildingType): boolean {
    const gridPos = this.getGridPositionFromGlobal(globalPos);
    if (!gridPos) return false;

    return this.tryPlaceBuildingAtGrid(gridPos.gridX, gridPos.gridY, type);
  }

  public tryPlaceBuildingAtGrid(
    gridX: number,
    gridY: number,
    type: BuildingType
  ): boolean {
    if (this.placementValidator && !this.placementValidator(gridX, gridY, type)) {
      return false;
    }
    if (!this.isWithinBounds(gridX, gridY, type)) return false;
    if (!this.isAreaFree(gridX, gridY, type)) return false;
    if (!this.hasRequiredRoadAdjacency(gridX, gridY, type)) return false;

    const building = new Building(gridX, gridY, type);
    this.world.addChild(building);
    this.registerBuildingFootprint(building);

    if (this.onBuildingPlaced) {
      this.onBuildingPlaced(building);
    }

    if (this.ghost) {
      this.setDragMode(this.draggingType);
    }

    return true;
  }

  public getGridPositionFromGlobal(globalPos: Point):
    | { gridX: number; gridY: number }
    | null {
    const localPos = this.world.toLocal(globalPos);
    const gridX = Math.floor(localPos.x / CELL_SIZE);
    const gridY = Math.floor(localPos.y / CELL_SIZE);

    if (!this.isWithinGrid(gridX, gridY)) return null;

    return { gridX, gridY };
  }

  public setDragMode(type: BuildingType | null) {
    this.draggingType = type;

    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }

    if (type) {
      const ghost = new Graphics();
      const widthPx = type.width * CELL_SIZE;
      const heightPx = type.height * CELL_SIZE;
      ghost
        .rect(-widthPx / 2, -heightPx / 2, widthPx, heightPx)
        .fill({ color: type.color, alpha: 0.35 });
      ghost.alpha = 0.9;
      this.ghost = ghost;
      this.world.addChild(this.ghost);
      // ✅ ne touche plus au curseur (toujours croix)
    }
  }

  public getDraggingMode(): BuildingType | null {
    return this.draggingType;
  }

  public getBuildings(): Building[] {
    return Array.from(new Set(this.buildingsMap.values()));
  }

  public getRoadBuildings(): Building[] {
    return this.getBuildings().filter((b) => b.type.isRoad);
  }

  public getRoadNeighbors(b: Building): Building[] {
    const res = new Set<Building>();
    this.forEachPerimeterNeighbor(b.gridX, b.gridY, b.type, (gx, gy) => {
      const nb = this.getBuildingAtGrid(gx, gy);
      if (nb?.type.isRoad) {
        res.add(nb);
      }
    });
    return Array.from(res);
  }

  public getRoadBuildingAt(gx: number, gy: number): Building | null {
    const b = this.getBuildingAtGrid(gx, gy);
    return b && b.type.isRoad ? b : null;
  }

  public getBuildingAtGrid(gx: number, gy: number): Building | null {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return null;
    return this.buildingsMap.get(this.key(gx, gy)) || null;
  }

  public getAdjacentNonRoadBuildings(gx: number, gy: number): Building[] {
    const res = new Map<string, Building>();
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const b = this.getBuildingAtGrid(gx + dx, gy + dy);
      if (
        b &&
        !b.type.isRoad &&
        (b.type.capacity > 0 || b.type.staffCapacity > 0)
      ) {
        res.set(b.state.instanceId, b);
      }
    }
    return Array.from(res.values());
  }

  private isWithinGrid(gridX: number, gridY: number) {
    return gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE;
  }

  private isWithinBounds(gridX: number, gridY: number, type: BuildingType) {
    const width = Math.max(1, type.width);
    const height = Math.max(1, type.height);
    return (
      gridX >= 0 &&
      gridY >= 0 &&
      gridX + width <= GRID_SIZE &&
      gridY + height <= GRID_SIZE
    );
  }

  private isAreaFree(gridX: number, gridY: number, type: BuildingType) {
    let free = true;
    this.forEachFootprintCell(gridX, gridY, type, (x, y) => {
      if (this.buildingsMap.has(this.key(x, y))) {
        free = false;
      }
    });
    return free;
  }

  private hasRequiredRoadAdjacency(
    gridX: number,
    gridY: number,
    type: BuildingType
  ): boolean {
    if (type.isRoad || type.requiresRoadAccess === false) return true;

    let hasRoad = false;
    this.forEachPerimeterNeighbor(gridX, gridY, type, (x, y) => {
      if (this.getRoadBuildingAt(x, y)) {
        hasRoad = true;
      }
    });
    return hasRoad;
  }

  private registerBuildingFootprint(building: Building) {
    this.forEachFootprintCell(
      building.gridX,
      building.gridY,
      building.type,
      (x, y) => {
        this.buildingsMap.set(this.key(x, y), building);
      }
    );
  }

  private forEachFootprintCell(
    gridX: number,
    gridY: number,
    type: BuildingType,
    cb: (x: number, y: number) => void
  ) {
    const width = Math.max(1, type.width);
    const height = Math.max(1, type.height);
    for (let x = gridX; x < gridX + width; x++) {
      for (let y = gridY; y < gridY + height; y++) {
        cb(x, y);
      }
    }
  }

  private forEachPerimeterNeighbor(
    gridX: number,
    gridY: number,
    type: BuildingType,
    cb: (x: number, y: number) => void
  ) {
    const width = Math.max(1, type.width);
    const height = Math.max(1, type.height);

    const visitNeighbor = (x: number, y: number) => {
      if (!this.isWithinGrid(x, y)) return;
      cb(x, y);
    };

    for (let x = gridX; x < gridX + width; x++) {
      visitNeighbor(x, gridY - 1);
      visitNeighbor(x, gridY + height);
    }

    for (let y = gridY; y < gridY + height; y++) {
      visitNeighbor(gridX - 1, y);
      visitNeighbor(gridX + width, y);
    }
  }

  private onPointerMove(e: FederatedPointerEvent) {
    if (!this.draggingType || !this.ghost) return;

    const localPos = this.world.toLocal(e.global);
    const gridX = Math.floor(localPos.x / CELL_SIZE);
    const gridY = Math.floor(localPos.y / CELL_SIZE);

    const centerX = (gridX + this.draggingType.width / 2) * CELL_SIZE;
    const centerY = (gridY + this.draggingType.height / 2) * CELL_SIZE;

    this.ghost.position.set(centerX, centerY);

    const isOccupied = !this.isAreaFree(gridX, gridY, this.draggingType);
    const outOfBounds = !this.isWithinBounds(gridX, gridY, this.draggingType);
    const rejectedByRule =
      this.placementValidator &&
      !this.placementValidator(gridX, gridY, this.draggingType);
    const hasRoadAccess = this.hasRequiredRoadAdjacency(
      gridX,
      gridY,
      this.draggingType
    );

    this.ghost.tint =
      isOccupied || outOfBounds || !hasRoadAccess || rejectedByRule
        ? 0xef4444
        : 0x22c55e;
  }
}
