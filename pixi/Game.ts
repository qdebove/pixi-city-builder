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

    // auto-clickers
    this.buildingManager.getBuildings().forEach((b) => {
      if (!b.state.isAutoClickerActive || !b.state.isAutoClickerUnlocked)
        return;

      if (now - b.lastAutoClickTime >= b.state.autoClickerInterval) {
        this.harvestBuilding(b, true);
        b.lastAutoClickTime = now;
      }
    });

    // personnages
    this.peopleManager.update(now);
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

      this.selectBuilding(hitBuilding);

      // si auto-click actif : pas de clic manuel
      if (!hitBuilding.state.isAutoClickerActive) {
        this.harvestBuilding(hitBuilding, false);
      }

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

  public harvestBuilding(building: Building, isAuto: boolean) {
    const income = building.getIncome();
    this.money += income;

    if (!isAuto) this.totalClicks++;

    const center = building.getCenterGlobalPosition();
    new FloatingText(this.app, income, center.x, center.y);

    building.pulse();
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
    if (b.type.isRoad) return; // pas d'upgrade pour les routes

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
    if (!this.selectedBuilding || this.isPaused) return;
    const b = this.selectedBuilding;
    if (b.type.isRoad) return;

    const hasAuto = b.state.isAutoClickerUnlocked;
    const canUnlockByLevel =
      b.state.level >= b.type.autoClickerUnlockLevel;

    if (!hasAuto) {
      if (!canUnlockByLevel) return;

      const cost = calculateAutoClickerUpgradeCost(
        b.type,
        b.state.autoClickerLevel
      ); // level 0 -> prix niv 1
      if (this.money < cost) return;

      this.money -= cost;

      b.updateState({
        isAutoClickerUnlocked: true,
        autoClickerLevel: 1,
        isAutoClickerActive: true,
        autoClickerInterval: 2000,
      });
      b.lastAutoClickTime = performance.now();
      this.emitState();
      return;
    }

    const nextActive = !b.state.isAutoClickerActive;
    b.updateState({ isAutoClickerActive: nextActive });
    if (nextActive) {
      b.lastAutoClickTime = performance.now();
    }
    this.emitState();
  }

  public upgradeAutoClickerSpeed() {
    if (!this.selectedBuilding || this.isPaused) return;
    const b = this.selectedBuilding;
    if (!b.state.isAutoClickerUnlocked || b.type.isRoad) return;

    const currentLevel = b.state.autoClickerLevel;
    if (currentLevel >= b.type.autoClickerMaxLevel) return;

    const cost = calculateAutoClickerUpgradeCost(b.type, currentLevel);
    if (this.money < cost) return;

    this.money -= cost;

    const newLevel = currentLevel + 1;
    const newInterval = Math.max(100, b.state.autoClickerInterval * 0.9);

    b.updateState({
      autoClickerLevel: newLevel,
      autoClickerInterval: newInterval,
    });

    this.emitState();
  }

  // ---- Pause / Reprise avec correction des timers ----
  public pause() {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pauseStartedAt = performance.now();
      this.peopleManager.pauseAll(); // gèle les personnages
      this.emitState();
    }
  }

  public resume() {
    if (this.isPaused && this.pauseStartedAt !== null) {
      const now = performance.now();
      const delta = now - this.pauseStartedAt;

      // décale les timers des auto-clickers
      this.buildingManager.getBuildings().forEach((b) => {
        b.lastAutoClickTime += delta;
      });

      // décale le timer de spawn des persos
      this.peopleManager.shiftTimers(delta);
      this.peopleManager.resumeAll(); // redémarre les personnages

      this.isPaused = false;
      this.pauseStartedAt = null;
      this.emitState();
    }
  }

  private emitState() {
    this.onStateChange({
      money: this.money,
      totalClicks: this.totalClicks,
      selectedBuildingState: this.selectedBuilding
        ? { ...this.selectedBuilding.state }
        : null,
      isPaused: this.isPaused,
    });
  }

  public destroy() {
    this.app.destroy(true, { children: true });
  }
}
