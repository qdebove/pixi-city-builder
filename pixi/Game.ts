import { Application, Assets, FederatedPointerEvent, Point } from 'pixi.js';
import { AssetDefinition } from '../types/data-contract';
import { BuildingState, BuildingType, PersonRole, calculateUpgradeCost } from '../types/types';
import { Building } from './Building';
import { BuildingManager } from './BuildingManager';
import { FloatingText } from './FloatingText';
import { PeopleManager } from './PeopleManager';
import { ReputationSnapshot, ReputationSystem } from './ReputationSystem';
import { WorldView } from './WorldView';
import { SimulationClock, TickContext } from './SimulationClock';
import { SpriteResolver } from './assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from './assets/registry';
import { IncomePulse } from './IncomePulse';
import { BuildingSkillSnapshot, SkillEngine } from './skills/SkillEngine';
import { SelectedPersonSnapshot } from '@/types/ui';
import { EventSystem } from './EventSystem';
import { ActiveEventSnapshot } from './EventSystem';
import { TimeSnapshot, TimeSystem } from './TimeSystem';
import { DebtSnapshot, DebtSystem } from './DebtSystem';
import { DEBT_SETTINGS, TIME_SETTINGS } from './data/time-settings';

export interface GameUIState {
  money: number;
  totalClicks: number;
  selectedBuildingState: BuildingState | null;
  selectedPerson: SelectedPersonSnapshot | null;
  isPaused: boolean;
  movingPeopleCount: number;
  occupantsByType: Record<string, number>;
  peopleByRole: Record<PersonRole, number>;
  occupantsByRole: Record<PersonRole, number>;
  reputation: ReputationSnapshot;
  zoom: number;
  activeEvents: ActiveEventSnapshot[];
  time: TimeSnapshot;
  debt: DebtSnapshot;
}

export class Game {
  private app: Application;
  private worldView: WorldView;
  private buildingManager: BuildingManager;
  private peopleManager: PeopleManager;
  private simulation: SimulationClock;
  private timeSystem: TimeSystem;
  private debtSystem: DebtSystem;
  private spriteResolver: SpriteResolver;
  private reputationSystem: ReputationSystem;
  private skillEngine: SkillEngine;
  private eventSystem: EventSystem;

  private money: number = 1000;
  private totalClicks: number = 0;
  private selectedBuilding: Building | null = null;
  private selectedPerson: SelectedPersonSnapshot | null = null;
  private isPaused: boolean = false;
  private pauseStartedAt: number | null = null;
  private activeEvents: ActiveEventSnapshot[] = [];

  private isPaintingRoad = false;
  private lastPaintedCell: { gridX: number; gridY: number } | null = null;

  private lastStatsUpdate = 0;

  private onStateChange: (state: GameUIState) => void;

  constructor(
    container: HTMLDivElement,
    onStateChange: (state: GameUIState) => void
  ) {
    this.onStateChange = onStateChange;
    this.spriteResolver = new SpriteResolver(BASE_ASSET_REGISTRY);
    this.reputationSystem = new ReputationSystem();
    this.skillEngine = new SkillEngine();
    this.eventSystem = new EventSystem();
    this.timeSystem = new TimeSystem(TIME_SETTINGS);
    this.debtSystem = new DebtSystem(DEBT_SETTINGS);

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
      this.spriteResolver,
      this.onPersonSelected,
      this.onPersonRemoved
    );

    this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
    this.app.stage.on('pointerup', this.stopRoadPainting.bind(this));
    this.app.stage.on('pointerupoutside', this.stopRoadPainting.bind(this));
    this.app.ticker.add(this.onFrameUpdate);

    this.emitState();
  }

  private async preloadAssets() {
    const assets: AssetDefinition[] = Object.values(BASE_ASSET_REGISTRY.assets);

    assets.forEach((asset) => {
      if (!Assets.get(asset.id)) {
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
    const eventModifiers = this.eventSystem.update(ctx);
    this.activeEvents = eventModifiers.activeEvents;

    const timeAdvance = this.timeSystem.advance(ctx.deltaMs);
    if (timeAdvance.monthsAdvanced > 0) {
      for (let i = 0; i < timeAdvance.monthsAdvanced; i++) {
        const payment = this.debtSystem.processNewMonth();
        this.money -= payment;
      }
    }

    this.buildingManager.getBuildings().forEach((building) => {
      const skillSnapshot = building.type.isRoad
        ? null
        : this.skillEngine.computeBuildingSnapshot(building, ctx.tick);

      if (skillSnapshot && !building.type.isRoad) {
        building.updateState({ productionIntervalMs: skillSnapshot.intervalMs });
      }

      const completedCycles = building.accumulateIncomeProgress(ctx.deltaMs);
      for (let i = 0; i < completedCycles; i++) {
        this.harvestBuilding(
          building,
          skillSnapshot ?? undefined,
          eventModifiers.incomeMultiplier
        );
      }
    });

    this.peopleManager.setSpawnIntervalMultiplier(
      eventModifiers.spawnIntervalMultiplier
    );
    this.peopleManager.update(ctx);

    this.reputationSystem.update({
      buildings: this.buildingManager.getBuildings(),
      movingPeople: this.peopleManager.getPeopleCountByRole(),
      deltaMs: ctx.deltaMs,
    });

    this.reputationSystem.applyExternalDelta(eventModifiers.reputationDelta);

    if (eventModifiers.moneyDelta !== 0) {
      this.money += eventModifiers.moneyDelta;
    }

    if (ctx.nowMs - this.lastStatsUpdate > 250) {
      this.lastStatsUpdate = ctx.nowMs;
      this.emitState();
    }
  };

  private onPersonSelected = (selection: SelectedPersonSnapshot) => {
    if (this.selectedBuilding) {
      this.selectedBuilding.setSelected(false);
      this.selectedBuilding = null;
    }
    this.selectedPerson = selection;
    this.emitState();
  };

  private onPersonRemoved = (id: string) => {
    if (this.selectedPerson?.id === id) {
      this.selectedPerson = null;
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
    const draggingType = this.buildingManager.getDraggingMode();

    if (draggingType?.isRoad) {
      this.isPaintingRoad = true;
      this.paintRoadAtGlobal(e.global);
      e.stopPropagation();
      return;
    }

    if (hitBuilding) {
      if (isBuildingMode) return;

      if (hitBuilding.type.isRoad) {
        this.deselectBuilding();
        this.deselectPerson();
        return;
      }

      this.selectBuilding(hitBuilding);
      e.stopPropagation();
    } else {
      if (isBuildingMode) {
        this.tryPlaceBuilding(e.global);
      } else {
        this.deselectBuilding();
        this.deselectPerson();
      }
    }
  }

  private onPointerMove(e: FederatedPointerEvent) {
    if (!this.isPaintingRoad) return;
    this.paintRoadAtGlobal(e.global);
  }

  private stopRoadPainting() {
    if (!this.isPaintingRoad) return;
    this.isPaintingRoad = false;
    this.lastPaintedCell = null;
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

  public harvestBuilding(
    building: Building,
    skillSnapshot?: BuildingSkillSnapshot,
    incomeMultiplier: number = 1
  ) {
    const baseIncome = skillSnapshot?.incomePerTick ?? building.getIncome();
    const income = Math.floor(baseIncome * Math.max(0, incomeMultiplier));
    if (income <= 0) return;

    this.money += income;
    this.totalClicks++;

    const center = building.getCenterGlobalPosition();
    new FloatingText(this.app, income, center.x, center.y);
    new IncomePulse(this.app, center.x, center.y, 1);

    this.emitState();
  }

  private paintRoadAtGlobal(globalPos: Point) {
    const type = this.buildingManager.getDraggingMode();
    if (!type?.isRoad) return;

    const gridPos = this.buildingManager.getGridPositionFromGlobal(globalPos);
    if (!gridPos) return;

    if (
      this.lastPaintedCell &&
      gridPos.gridX === this.lastPaintedCell.gridX &&
      gridPos.gridY === this.lastPaintedCell.gridY
    ) {
      return;
    }

    const start = this.lastPaintedCell ?? gridPos;
    const path = this.computeManhattanPath(start, gridPos);

    let spent = 0;
    for (const cell of path) {
      if (this.money < type.cost) break;
      const placed = this.buildingManager.tryPlaceBuildingAtGrid(
        cell.gridX,
        cell.gridY,
        type
      );
      if (placed) {
        this.money -= type.cost;
        spent += type.cost;
      }
    }

    if (spent > 0) {
      this.emitState();
    }

    this.lastPaintedCell = gridPos;
  }

  private computeManhattanPath(
    from: { gridX: number; gridY: number },
    to: { gridX: number; gridY: number }
  ): { gridX: number; gridY: number }[] {
    const path: { gridX: number; gridY: number }[] = [];
    let cx = from.gridX;
    let cy = from.gridY;
    path.push({ gridX: cx, gridY: cy });

    while (cx !== to.gridX) {
      cx += Math.sign(to.gridX - cx);
      path.push({ gridX: cx, gridY: cy });
    }

    while (cy !== to.gridY) {
      cy += Math.sign(to.gridY - cy);
      path.push({ gridX: cx, gridY: cy });
    }

    return path;
  }

  public selectBuilding(b: Building) {
    if (this.selectedBuilding) this.selectedBuilding.setSelected(false);
    this.selectedBuilding = b;
    b.setSelected(true);
    this.selectedPerson = null;
    this.emitState();
  }

  public deselectBuilding() {
    if (this.selectedBuilding) {
      this.selectedBuilding.setSelected(false);
      this.selectedBuilding = null;
    }
    this.emitState();
  }

  public deselectPerson() {
    if (this.selectedPerson) {
      this.selectedPerson = null;
      this.emitState();
    }
  }

  public setDragMode(type: BuildingType | null) {
    this.buildingManager.setDragMode(type);
    if (type) {
      this.deselectPerson();
    }
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
      selectedPerson: this.selectedPerson
        ? { ...this.selectedPerson }
        : null,
      isPaused: this.isPaused,
      movingPeopleCount,
      occupantsByType,
      peopleByRole,
      occupantsByRole,
      reputation: this.reputationSystem.snapshot(),
      zoom: this.worldView.getScale(),
      activeEvents: this.activeEvents,
      time: this.timeSystem.snapshotState(),
      debt: this.debtSystem.snapshotState(),
    });
  }

  public destroy() {
    this.worldView.destroy();
    this.app.destroy(true, { children: true });
  }
}
