import { Application, Assets, FederatedPointerEvent, Point } from 'pixi.js';
import {
  BuildingState,
  BuildingType,
  PersonRole,
  calculateAutoClickerUpgradeCost,
  calculateUpgradeCost,
} from '../types/types';
import { Building } from './Building';
import { BuildingManager } from './BuildingManager';
import { FloatingText } from './FloatingText';
import { PeopleManager } from './PeopleManager';
import { ReputationSnapshot, ReputationSystem } from './ReputationSystem';
import { WorldView } from './WorldView';
import { SimulationClock, TickContext } from './SimulationClock';
import { SpriteResolver } from './assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from './assets/registry';

export interface GameUIState {
  money: number;
  totalClicks: number;
  selectedBuildingState: BuildingState | null;
  isPaused: boolean;
  movingPeopleCount: number;
  occupantsByType: Record<string, number>;
  peopleByRole: Record<PersonRole, number>;
  occupantsByRole: Record<PersonRole, number>;
  reputation: ReputationSnapshot;
}

export class Game {
  private app: Application;
  private worldView: WorldView;
  private buildingManager: BuildingManager;
  private peopleManager: PeopleManager;
  private simulation: SimulationClock;
  private spriteResolver: SpriteResolver;
  private reputationSystem: ReputationSystem;

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
    this.spriteResolver = new SpriteResolver(BASE_ASSET_REGISTRY);
    this.reputationSystem = new ReputationSystem();

    this.app = new Application();
    this.simulation = new SimulationClock({
      tickDurationMs: 250,
      maxCatchUpTicks: 6,
      onTick: this.onSimulationTick,
    });
    this.init(container);
  }

  private async init(container: HTMLDivElement) {
    await this.app.init({
      background: '#0f172a',
      resizeTo: container,
      antialias: true,
    });
    container.appendChild(this.app.canvas);

    await this.preloadAssets();

    // ✅ Forcer le curseur en croix sur le canvas lui-même
    this.app.canvas.style.cursor = 'crosshair';

    this.worldView = new WorldView(this.app);
    this.buildingManager = new BuildingManager(this.app, this.worldView.world);
    this.peopleManager = new PeopleManager(
      this.app,
      this.worldView.world,
      this.buildingManager,
      this.spriteResolver
    );

    this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
    this.app.ticker.add(this.onFrameUpdate);

    this.emitState();
  }

  private async preloadAssets() {
    const assets = Object.values(BASE_ASSET_REGISTRY.assets);

    assets.forEach((asset) => {
      if (!Assets.exists(asset.id)) {
        Assets.add({ alias: asset.id, src: asset.uri });
      }
    });

    const aliases = assets.map((asset) => asset.id);
    await Assets.load(aliases);
  }

  private onFrameUpdate = () => {
    this.simulation.step(this.app.ticker.deltaMS, this.isPaused);
  };

  private onSimulationTick = (ctx: TickContext) => {
    this.buildingManager.getBuildings().forEach((building) => {
      const completedCycles = building.accumulateIncomeProgress(ctx.deltaMs);
      for (let i = 0; i < completedCycles; i++) {
        this.harvestBuilding(building);
      }
    });

    this.peopleManager.update(ctx);

    this.reputationSystem.update({
      buildings: this.buildingManager.getBuildings(),
      movingPeople: this.peopleManager.getPeopleCountByRole(),
      deltaMs: ctx.deltaMs,
    });

    if (ctx.nowMs - this.lastStatsUpdate > 250) {
      this.lastStatsUpdate = ctx.nowMs;
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
    const occupantsByRole: Record<PersonRole, number> = {
      visitor: 0,
      staff: 0,
    };
    this.buildingManager.getBuildings().forEach((b) => {
      const typeId = b.type.id;
      const total = b.getTotalOccupants();
      occupantsByType[typeId] = (occupantsByType[typeId] || 0) + total;

      const byRole = b.getOccupantsByRole();
      occupantsByRole.visitor += byRole.visitor || 0;
      occupantsByRole.staff += byRole.staff || 0;
    });

    const movingPeopleCount = this.peopleManager.getPeopleCount();
    const peopleByRole = this.peopleManager.getPeopleCountByRole();

    return { occupantsByType, movingPeopleCount, peopleByRole, occupantsByRole };
  }

  private emitState() {
    const { occupantsByType, movingPeopleCount, peopleByRole, occupantsByRole } =
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
      peopleByRole,
      occupantsByRole,
      reputation: this.reputationSystem.snapshot(),
    });
  }

  public destroy() {
    this.app.destroy(true, { children: true });
  }
}
