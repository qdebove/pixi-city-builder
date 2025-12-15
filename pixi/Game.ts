import {
  Application,
  Assets,
  FederatedPointerEvent,
  Graphics,
  Point,
  Texture,
} from 'pixi.js';
import { AssetDefinition } from '../types/data-contract';
import {
  BuildingState,
  BuildingType,
  PersonRole,
  calculateUpgradeCost,
  CELL_SIZE,
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
import { IncomePulse } from './IncomePulse';
import { BuildingSkillSnapshot, SkillEngine } from './skills/SkillEngine';
import { SelectedPersonSnapshot } from '@/types/ui';
import { EventSystem } from './EventSystem';
import { ActiveEventSnapshot } from './EventSystem';
import { TimeSnapshot, TimeSystem } from './TimeSystem';
import { DebtSnapshot, DebtSystem } from './DebtSystem';
import { DEBT_SETTINGS, TIME_SETTINGS } from './data/time-settings';
import { ECONOMY_SETTINGS } from './data/economy-settings';
import { SecuritySnapshot, SecuritySystem } from './SecuritySystem';
import { ServiceFlash } from './ServiceFlash';
import { WORKER_ROSTER } from './data/game-model';
import { Worker } from '@/types/data-contract';
import { computeWorkerCost } from './data/recruitment';
import { EconomySnapshot, EconomySystem } from './EconomySystem';
import { DistrictSnapshot, DistrictSystem } from './DistrictSystem';
import { BuildZoneSnapshot, BuildZoneSystem } from './BuildZoneSystem';
import { MAP_SETTINGS } from './data/map-settings';

export interface SelectedBuildingComputed {
  incomePerTick: number;
  incomeWithEvents: number;
  intervalMs: number;
  eventMultiplier: number;
  districtName?: string;
  districtIncomeMultiplier?: number;
}

export interface GameUIState {
  money: number;
  totalClicks: number;
  selectedBuildingState: BuildingState | null;
  selectedBuildingComputed: SelectedBuildingComputed | null;
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
  security: SecuritySnapshot;
  guardPresence: { roaming: number; stationed: number };
  hiredWorkers: string[];
  hiredByJob: Record<string, number>;
  economy: EconomySnapshot;
  districts: DistrictSnapshot;
  buildZone: BuildZoneSnapshot;
}

export class Game {
  private app: Application;
  private worldView: WorldView;
  private buildingManager: BuildingManager;
  private peopleManager: PeopleManager;
  private simulation: SimulationClock;
  private timeSystem: TimeSystem;
  private debtSystem: DebtSystem;
  private economySystem: EconomySystem;
  private districtSystem: DistrictSystem;
  private buildZoneSystem: BuildZoneSystem;
  private spriteResolver: SpriteResolver;
  private reputationSystem: ReputationSystem;
  private skillEngine: SkillEngine;
  private eventSystem: EventSystem;
  private securitySystem: SecuritySystem;
  private securitySnapshot: SecuritySnapshot;
  private guardPresence = { roaming: 0, stationed: 0 };
  private hiredWorkerIds = new Set<string>();

  private money: number = 1000;
  private totalClicks: number = 0;
  private selectedBuilding: Building | null = null;
  private selectedPerson: SelectedPersonSnapshot | null = null;
  private selectedBuildingComputed: SelectedBuildingComputed | null = null;
  private isPaused: boolean = false;
  private pauseStartedAt: number | null = null;
  private activeEvents: ActiveEventSnapshot[] = [];

  private buildZoneOverlay?: Graphics;
  private districtOverlay?: Graphics;

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
    this.economySystem = new EconomySystem(ECONOMY_SETTINGS, TIME_SETTINGS);
    this.districtSystem = new DistrictSystem();
    this.buildZoneSystem = new BuildZoneSystem(MAP_SETTINGS);
    this.securitySystem = new SecuritySystem();
    this.securitySnapshot = this.securitySystem.snapshot();

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
    this.buildingManager.setPlacementValidator((gx, gy, type) =>
      this.buildZoneSystem.canBuildAt(gx, gy, type.width, type.height)
    );
    this.buildingManager.setOnBuildingPlaced((building) => {
      const zone = this.districtSystem.getDistrictForBuilding(building);
      building.setDistrict(zone?.id);
    });
    this.peopleManager = new PeopleManager(
      this.app,
      this.worldView.world,
      this.buildingManager,
      this.spriteResolver,
      this.onPersonSelected,
      this.onPersonRemoved
    );

    this.syncPeoplePool();

    this.districtSystem.generateZones();
    this.drawDistricts();
    this.drawBuildZone();

    this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
    this.app.stage.on('pointerup', this.stopRoadPainting.bind(this));
    this.app.stage.on('pointerupoutside', this.stopRoadPainting.bind(this));
    this.app.ticker.add(this.onFrameUpdate);

    this.emitState();
  }

  private drawBuildZone() {
    if (this.buildZoneOverlay) {
      this.buildZoneOverlay.destroy();
    }

    const g = new Graphics();
    const bounds = this.buildZoneSystem.getBounds();
    g.zIndex = -1;
    g.rect(
      bounds.x * CELL_SIZE,
      bounds.y * CELL_SIZE,
      bounds.width * CELL_SIZE,
      bounds.height * CELL_SIZE
    )
      .fill({ color: 0x0ea5e9, alpha: 0.08 })
      .stroke({ width: 3, color: 0x38bdf8, alpha: 0.5 });

    this.buildZoneOverlay = g;
    this.worldView.world.addChild(g);
  }

  private drawDistricts() {
    if (this.districtOverlay) {
      this.districtOverlay.destroy();
    }

    const overlay = new Graphics();
    overlay.zIndex = -2;
    this.districtSystem.getZones().forEach((zone) => {
      overlay
        .rect(
          zone.area.x * CELL_SIZE,
          zone.area.y * CELL_SIZE,
          zone.area.width * CELL_SIZE,
          zone.area.height * CELL_SIZE
        )
        .fill({ color: zone.color, alpha: 0.05 })
        .stroke({ width: 2, color: zone.color, alpha: 0.4 });
    });

    this.districtOverlay = overlay;
    this.worldView.world.addChild(overlay);
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

    this.selectedBuildingComputed = null;

    const timeAdvance = this.timeSystem.advance(ctx.deltaMs);
    if (timeAdvance.monthsAdvanced > 0) {
      for (let i = 0; i < timeAdvance.monthsAdvanced; i++) {
        const payment = this.debtSystem.processNewMonth();
        this.money -= payment;
        this.economySystem.recordExpense(payment);

        const tax = this.economySystem.processMonthEnd();
        this.money -= tax;
      }
    }

    const upkeep = this.economySystem.computeOngoingCosts(
      this.buildingManager.getBuildings(),
      this.getHiredWorkerTemplates(),
      ctx.deltaMs
    );

    if (upkeep > 0) {
      this.money -= upkeep;
    }

    if (timeAdvance.daysAdvanced > 0) {
      const dailyIncome = this.economySystem.applyDailyIncome(
        this.buildingManager.getBuildings(),
        timeAdvance.daysAdvanced
      );
      if (dailyIncome !== 0) {
        this.money += dailyIncome;
      }
    }

    this.buildingManager.getBuildings().forEach((building) => {
      const skillSnapshot = building.type.isRoad
        ? null
        : this.skillEngine.computeBuildingSnapshot(building, ctx.tick);

      const districtMultiplier = this.districtSystem.getIncomeMultiplier(building);
      const districtZone = this.districtSystem.getDistrictForBuilding(building);

      if (skillSnapshot && !building.type.isRoad) {
        building.updateState({ productionIntervalMs: skillSnapshot.intervalMs });
      }

      const completedCycles = building.accumulateIncomeProgress(ctx.deltaMs);

      if (
        this.selectedBuilding &&
        building.state.instanceId === this.selectedBuilding.state.instanceId
      ) {
        const baseIncome =
          (skillSnapshot?.incomePerTick ?? building.getIncome()) *
          districtMultiplier;
        this.selectedBuildingComputed = {
          incomePerTick: baseIncome,
          incomeWithEvents: Math.floor(
            baseIncome * Math.max(0, eventModifiers.incomeMultiplier)
          ),
          intervalMs: skillSnapshot?.intervalMs ?? building.getBaseIntervalMs(),
          eventMultiplier: eventModifiers.incomeMultiplier,
          districtName: districtZone?.name,
          districtIncomeMultiplier: districtMultiplier,
        };
      }

      for (let i = 0; i < completedCycles; i++) {
        this.harvestBuilding(
          building,
          skillSnapshot ?? undefined,
          eventModifiers.incomeMultiplier,
          districtMultiplier
        );
      }
    });

    this.peopleManager.setSpawnIntervalMultiplier(
      eventModifiers.spawnIntervalMultiplier
    );
    this.peopleManager.update(ctx);

    const guardBreakdown = this.peopleManager.getWorkersByJob();
    const roamingGuards = guardBreakdown.guard ?? 0;
    const stationedGuards = this.buildingManager
      .getBuildings()
      .reduce((acc, building) => {
        const guardCount = building
          .getStaffMembers()
          .filter((worker) => worker.jobs.primary === 'guard').length;
        return acc + guardCount;
      }, 0);

    this.guardPresence = { roaming: roamingGuards, stationed: stationedGuards };

    this.securitySnapshot = this.securitySystem.update({
      roamingGuardCount: roamingGuards,
      stationedGuards,
      movingPeople: this.peopleManager.getPeopleCount(),
      reputation: this.reputationSystem.snapshot(),
      deltaMs: ctx.deltaMs,
    });

    this.reputationSystem.update({
      buildings: this.buildingManager.getBuildings(),
      movingPeople: this.peopleManager.getPeopleCountByRole(),
      deltaMs: ctx.deltaMs,
    });

    this.reputationSystem.applyExternalDelta(eventModifiers.reputationDelta);

    if (eventModifiers.moneyDelta !== 0) {
      this.money += eventModifiers.moneyDelta;
      if (eventModifiers.moneyDelta > 0) {
        this.economySystem.recordIncome(eventModifiers.moneyDelta);
      } else {
        this.economySystem.recordExpense(-eventModifiers.moneyDelta);
      }
    }

    if (ctx.nowMs - this.lastStatsUpdate > 250) {
      this.lastStatsUpdate = ctx.nowMs;
      this.emitState();
    }
  };

  public hireWorker(workerId: string): boolean {
    const template = WORKER_ROSTER.find((worker) => worker.id === workerId);
    if (!template) return false;
    if (this.hiredWorkerIds.has(workerId)) return false;
    const hiringCost = computeWorkerCost(template);
    if (this.money < hiringCost) return false;

    this.money -= hiringCost;
    this.economySystem.recordExpense(hiringCost);
    this.hiredWorkerIds.add(workerId);
    this.syncPeoplePool();
    this.emitState();
    return true;
  }

  private syncPeoplePool() {
    const templates: Worker[] = WORKER_ROSTER.filter((worker) =>
      this.hiredWorkerIds.has(worker.id)
    );
    this.peopleManager.setAvailableWorkers(templates);
  }

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
      this.deselectBuilding();
      this.deselectPerson();
      this.stopRoadPainting();
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
        this.economySystem.recordExpense(type.cost);
        this.emitState();
      }
    }
  }

  public expandBuildZone(): boolean {
    const cost = this.buildZoneSystem.getNextExpansionCost();
    if (this.money < cost) return false;

    const expanded = this.buildZoneSystem.tryExpand();
    if (!expanded) return false;

    this.money -= cost;
    this.economySystem.recordExpense(cost);
    this.drawBuildZone();
    this.emitState();
    return true;
  }

  public harvestBuilding(
    building: Building,
    skillSnapshot?: BuildingSkillSnapshot,
    incomeMultiplier: number = 1,
    districtMultiplier: number = 1
  ) {
    const baseIncome =
      (skillSnapshot?.incomePerTick ?? building.getIncome()) *
      Math.max(0, districtMultiplier);
    const income = Math.floor(baseIncome * Math.max(0, incomeMultiplier));
    if (income <= 0) return;

    this.money += income;
    this.economySystem.recordIncome(income);
    this.totalClicks++;

    const center = building.getCenterGlobalPosition();
    new FloatingText(this.app, income, center.x, center.y);
    new IncomePulse(this.app, center.x, center.y, 1);

    const staff = building.getStaffMembers();
    if (staff.length > 0) {
      const worker = staff[Math.floor(Math.random() * staff.length)];
      const resolved = this.spriteResolver.resolve({
        kind: 'portrait',
        target: 'worker',
        entity: { id: worker.id, tags: 'worker' },
        variant: 'idle',
        seedKey: worker.id,
      });
      if (resolved) {
        const texture = Texture.from(resolved.assetId);
        new ServiceFlash(this.app, texture, center.x, center.y - 28);
      }
    }

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
      this.economySystem.recordExpense(spent);
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
      this.economySystem.recordExpense(cost);

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

  private getHiredWorkerTemplates(): Worker[] {
    return Array.from(this.hiredWorkerIds.values())
      .map((id) => WORKER_ROSTER.find((w) => w.id === id))
      .filter((w): w is Worker => Boolean(w));
  }

  private emitState() {
    const { occupantsByType, movingPeopleCount, peopleByRole, occupantsByRole } =
      this.computeGlobalStats();

    const hiredByJob = Array.from(this.hiredWorkerIds.values()).reduce(
      (acc, id) => {
        const template = WORKER_ROSTER.find((worker) => worker.id === id);
        if (template) {
          const jobId = template.jobs.primary;
          acc[jobId] = (acc[jobId] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const economy = this.economySystem.snapshot();
    const districts = this.districtSystem.snapshot(
      this.buildingManager.getBuildings()
    );
    const buildZone = this.buildZoneSystem.snapshot();

    this.onStateChange({
      money: this.money,
      totalClicks: this.totalClicks,
      selectedBuildingState: this.selectedBuilding
        ? { ...this.selectedBuilding.state }
        : null,
      selectedBuildingComputed: this.selectedBuildingComputed,
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
      security: this.securitySnapshot,
      guardPresence: this.guardPresence,
      hiredWorkers: Array.from(this.hiredWorkerIds.values()),
      hiredByJob,
      economy,
      districts,
      buildZone,
    });
  }

  public destroy() {
    this.buildZoneOverlay?.destroy();
    this.districtOverlay?.destroy();
    this.worldView.destroy();
    this.app.destroy(true, { children: true });
  }
}
