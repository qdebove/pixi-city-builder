import { Application, FederatedPointerEvent, Point, Ticker } from 'pixi.js';
import {
  BuildingState,
  BuildingType,
  calculateAutoClickerUpgradeCost,
  calculateUpgradeCost,
} from '../types/types';
import { Building } from './Building';
import { BuildingManager } from './BuildingManager';
import { FloatingText } from './FloatingText';
import { PeopleManager } from './PeopleManager';
import { WorldView } from './WorldView';

export interface GameUIState {
  money: number;
  totalClicks: number;
  selectedBuildingState: BuildingState | null;
  isPaused: boolean;
  movingPeopleCount: number;
  occupantsByType: Record<string, number>;
}

export class Game {
  private app: Application;
  private worldView: WorldView;
  private buildingManager: BuildingManager;
  private peopleManager: PeopleManager;

  private money: number = 1000;
  private totalClicks: number = 0;
  private selectedBuilding: Building | null = null;
  private isPaused: boolean = false;
  private pauseStartedAt: number | null = null;

  private lastStatsUpdate = 0;

  private onStateChange: (state: GameUIState) => void;

  constructor(
    container: HTMLDivElement,
    onStateChange: (state: GameUIState) => void
  ) {
    this.onStateChange = onStateChange;

    this.app = new Application();
    this.init(container);
  }

  private async init(container: HTMLDivElement) {
    await this.app.init({
      background: '#0f172a',
      resizeTo: container,
      antialias: true,
    });
    container.appendChild(this.app.canvas);

    // ✅ Forcer le curseur en croix sur le canvas lui-même
    this.app.canvas.style.cursor = 'crosshair';

    this.worldView = new WorldView(this.app);
    this.buildingManager = new BuildingManager(this.app, this.worldView.world);
    this.peopleManager = new PeopleManager(
      this.app,
      this.worldView.world,
      this.buildingManager
    );

    this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
    this.app.ticker.add(this.update);

    this.emitState();
  }

  private update = (ticker: Ticker) => {
    const now = performance.now();
    if (this.isPaused) return;

    // Production passive
    this.buildingManager.getBuildings().forEach((b) => {
      if (b.type.isRoad) return;

      if (now - b.lastAutoClickTime >= b.state.autoClickerInterval) {
        this.harvestBuilding(b);
        b.lastAutoClickTime = now;
      }
    });

    // Personnes
    this.peopleManager.update(now);

    if (now - this.lastStatsUpdate > 250) {
      this.lastStatsUpdate = now;
      this.emitState();
    }
  };

  private onPointerDown(e: FederatedPointerEvent) {
    if (this.isPaused) return;

    if (e.button === 2) {
      this.setDragMode(null);
      return;
    }

    const hitBuilding = this.buildingManager.getBuildingAtGlobal(e.global);
    const isBuildingMode = this.buildingManager.getDraggingMode() !== null;

    if (hitBuilding) {
      if (isBuildingMode) return;

      if (hitBuilding.type.isRoad) {
        this.deselectBuilding();
        return;
      }

      this.selectBuilding(hitBuilding);
      e.stopPropagation();
    } else {
      if (isBuildingMode) {
        this.tryPlaceBuilding(e.global);
      } else {
        this.deselectBuilding();
      }
    }
  }

  public tryPlaceBuilding(globalPos: Point) {
    if (this.isPaused) return;

    const type = this.buildingManager.getDraggingMode();
    if (!type) return;

    if (this.money >= type.cost) {
      const success = this.buildingManager.tryPlaceBuildingAt(globalPos, type);
      if (success) {
        this.money -= type.cost;
        this.emitState();
      }
    }
  }

  public harvestBuilding(building: Building) {
    const income = building.getIncome();
    if (income <= 0) return;

    this.money += income;
    this.totalClicks++;

    const center = building.getCenterGlobalPosition();
    new FloatingText(this.app, income, center.x, center.y);

    this.emitState();
  }

  public selectBuilding(b: Building) {
    if (this.selectedBuilding) this.selectedBuilding.setSelected(false);
    this.selectedBuilding = b;
    b.setSelected(true);
    this.emitState();
  }

  public deselectBuilding() {
    if (this.selectedBuilding) {
      this.selectedBuilding.setSelected(false);
      this.selectedBuilding = null;
    }
    this.emitState();
  }

  public setDragMode(type: BuildingType | null) {
    this.buildingManager.setDragMode(type);
    this.emitState();
  }

  public upgradeSelectedBuilding() {
    if (!this.selectedBuilding || this.isPaused) return;
    const b = this.selectedBuilding;
    if (b.type.isRoad) return;

    const cost = calculateUpgradeCost(b.type, b.state.level);

    if (this.money >= cost && b.state.level < b.type.maxLevel) {
      this.money -= cost;

      const nextLevel = b.state.level + 1;
      b.updateState({
        level: nextLevel,
      });

      this.emitState();
    }
  }

  public toggleAutoClicker() {
    // plus utilisé (prod toujours auto), conservé pour compat
  }

  public upgradeAutoClickerSpeed() {
    if (!this.selectedBuilding || this.isPaused) return;
    const b = this.selectedBuilding;
    if (b.type.isRoad) return;

    const currentLevel = b.state.autoClickerLevel;
    if (currentLevel >= b.type.autoClickerMaxLevel) return;

    const cost = calculateAutoClickerUpgradeCost(
      b.type,
      currentLevel
    );
    if (this.money < cost) return;

    this.money -= cost;

    const newLevel = currentLevel + 1;
    const newInterval = Math.max(200, b.state.autoClickerInterval * 0.9);

    b.updateState({
      autoClickerLevel: newLevel,
      autoClickerInterval: newInterval,
    });

    this.emitState();
  }

  public pause() {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pauseStartedAt = performance.now();
      this.peopleManager.pauseAll();
      this.emitState();
    }
  }

  public resume() {
    if (this.isPaused && this.pauseStartedAt !== null) {
      const now = performance.now();
      const delta = now - this.pauseStartedAt;

      this.buildingManager.getBuildings().forEach((b) => {
        b.lastAutoClickTime += delta;
      });

      this.peopleManager.shiftTimers(delta);
      this.peopleManager.resumeAll();

      this.isPaused = false;
      this.pauseStartedAt = null;
      this.emitState();
    }
  }

  public getSelectedBuildingScreenPosition(): Point | null {
    if (!this.selectedBuilding) return null;
    return this.selectedBuilding.getCenterGlobalPosition();
  }

  private computeGlobalStats() {
    const occupantsByType: Record<string, number> = {};
    this.buildingManager.getBuildings().forEach((b) => {
      const typeId = b.type.id;
      occupantsByType[typeId] =
        (occupantsByType[typeId] || 0) + b.state.currentOccupants;
    });

    const movingPeopleCount = this.peopleManager.getPeopleCount();

    return { occupantsByType, movingPeopleCount };
  }

  private emitState() {
    const { occupantsByType, movingPeopleCount } =
      this.computeGlobalStats();

    this.onStateChange({
      money: this.money,
      totalClicks: this.totalClicks,
      selectedBuildingState: this.selectedBuilding
        ? { ...this.selectedBuilding.state }
        : null,
      isPaused: this.isPaused,
      movingPeopleCount,
      occupantsByType,
    });
  }

  public destroy() {
    this.app.destroy(true, { children: true });
  }
}
