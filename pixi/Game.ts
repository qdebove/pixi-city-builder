import {
  Application,
  Assets,
  FederatedPointerEvent,
  Graphics,
  Point,
  Texture,
} from 'pixi.js';
import { AssetDefinition, AssetRegistry } from '../types/data-contract';
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
import { AttractionSnapshot, AttractionSystem } from './AttractionSystem';
import { WorldView } from './WorldView';
import { SimulationClock, TickContext } from './SimulationClock';
import { SpriteResolver } from './assets/SpriteResolver';
import { BASE_ASSET_REGISTRY } from './assets/registry';
import { IncomePulse } from './IncomePulse';
import { BuildingSkillSnapshot, SkillEngine } from './skills/SkillEngine';
import { GameNotification, SelectedPersonSnapshot } from '@/types/ui';
import { EventSystem } from './EventSystem';
import { ActiveEventSnapshot } from './EventSystem';
import { TimeSnapshot, TimeSystem } from './TimeSystem';
import { DebtSnapshot, DebtSystem } from './DebtSystem';
import { DEBT_SETTINGS, TIME_SETTINGS } from './data/time-settings';
import { ECONOMY_SETTINGS } from './data/economy-settings';
import { SecuritySnapshot, SecuritySystem } from './SecuritySystem';
import { ServiceFlash } from './ServiceFlash';
import { WORKER_ROSTER } from './data/game-model';
import {
  Worker,
  WorkerShiftAssignment,
  WorkerScheduleSlot,
} from '@/types/data-contract';
import { computeWorkerCost } from './data/recruitment';
import { EconomySnapshot, EconomySystem } from './EconomySystem';
import { DistrictSnapshot, DistrictSystem } from './DistrictSystem';
import { BuildZoneSnapshot, BuildZoneSystem } from './BuildZoneSystem';
import { MAP_SETTINGS } from './data/map-settings';
import {
  GameSaveState,
  PersistedBuildingState,
  PersistedWorkerSchedule,
} from '@/types/save';
import { createDefaultSchedule } from './data/worker-schedules';
import { NotificationCenter } from './NotificationCenter';

const SAVE_VERSION = 1;

export interface SelectedBuildingComputed {
  incomePerTick: number;
  incomeWithEvents: number;
  intervalMs: number;
  eventMultiplier: number;
  districtName?: string;
  districtIncomeMultiplier?: number;
  queueLength?: number;
  queueCapacity?: number;
  lastServiceSatisfaction?: number;
}

export interface InspectHoverSnapshot {
  id: string;
  label: string;
  kind: 'building' | 'road';
  efficiency?: number;
  connected?: boolean;
}

export interface BuildingStatsSnapshot {
  total: number;
  roads: number;
  byCategory: Record<string, number>;
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
  timeScale: number;
  hiredWorkers: string[];
  hiredByJob: Record<string, number>;
  economy: EconomySnapshot;
  districts: DistrictSnapshot;
  buildZone: BuildZoneSnapshot;
  activeAssetPacks: string[];
  attraction: AttractionSnapshot;
  workerSchedules: ReturnType<Game['buildWorkerScheduleSnapshots']>;
  notifications: GameNotification[];
  inspectMode: boolean;
  inspectHover: InspectHoverSnapshot | null;
  buildingStats: BuildingStatsSnapshot;
  placementHint: string | null;
}

type WorkerScheduleState = {
  workerId: string;
  slots: WorkerScheduleSlot[];
  fatigue: number;
  hunger: number;
  morale: number;
};

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
  private attractionSystem: AttractionSystem;
  private attractionSnapshot: AttractionSnapshot;
  private skillEngine: SkillEngine;
  private eventSystem: EventSystem;
  private notificationCenter: NotificationCenter;
  private securitySystem: SecuritySystem;
  private securitySnapshot: SecuritySnapshot;
  private guardPresence = { roaming: 0, stationed: 0 };
  private hiredWorkerIds = new Set<string>();
  private lastReputationBroadcast: ReputationSnapshot | null = null;

  private money: number = 1000;
  private totalClicks: number = 0;
  private selectedBuilding: Building | null = null;
  private selectedPerson: SelectedPersonSnapshot | null = null;
  private selectedBuildingComputed: SelectedBuildingComputed | null = null;
  private isPaused: boolean = false;
  private pauseStartedAt: number | null = null;
  private timeScale: number = 1;
  private activeEvents: ActiveEventSnapshot[] = [];
  private activeNotifications: GameNotification[] = [];
  private inspectMode = false;
  private inspectionOverlay?: Graphics;
  private lastInspectionRenderMs = 0;
  private inspectHover: InspectHoverSnapshot | null = null;
  private audioContext: AudioContext | null = null;
  private lastPlacementToneAt = 0;
  private placementHint: string | null = null;

  private buildZoneOverlay?: Graphics;
  private districtOverlay?: Graphics;

  private isPaintingRoad = false;
  private lastPaintedCell: { gridX: number; gridY: number } | null = null;

  private lastStatsUpdate = 0;

  private onStateChange: (state: GameUIState) => void;
  private assetRegistry: AssetRegistry;
  private readyPromise: Promise<void>;
  private workerSchedules = new Map<string, WorkerScheduleState>();
  private buildingSaturationTracker = new Map<string, { startedAt: number; lastSeen: number }>();

  constructor(
    container: HTMLDivElement,
    onStateChange: (state: GameUIState) => void
  ) {
    this.onStateChange = onStateChange;
    this.assetRegistry = {
      ...BASE_ASSET_REGISTRY,
      assets: { ...BASE_ASSET_REGISTRY.assets },
      rules: { ...BASE_ASSET_REGISTRY.rules },
      packs: BASE_ASSET_REGISTRY.packs,
      activePackIds: BASE_ASSET_REGISTRY.activePackIds
        ? [...BASE_ASSET_REGISTRY.activePackIds]
        : [],
    };
    this.spriteResolver = new SpriteResolver(this.assetRegistry);
    this.reputationSystem = new ReputationSystem();
    this.attractionSystem = new AttractionSystem();
    this.attractionSnapshot = this.attractionSystem.snapshotState();
    this.skillEngine = new SkillEngine();
    this.eventSystem = new EventSystem();
    this.notificationCenter = new NotificationCenter();
    this.timeSystem = new TimeSystem(TIME_SETTINGS);
    const defaultDueDay =
      DEBT_SETTINGS.dueDay ?? TIME_SETTINGS.daysPerMonth ?? 30;
    this.debtSystem = new DebtSystem(DEBT_SETTINGS, defaultDueDay);
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
    this.initWorkerSchedules();
    this.readyPromise = this.init(container);
  }

  public whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private async init(container: HTMLDivElement) {
    await this.app.init({
      background: '#0f172a',
      resizeTo: container,
      antialias: true,
    });
    container.appendChild(this.app.canvas);

    await this.preloadAssets(this.assetRegistry.activePackIds);

    // ✅ Forcer le curseur en croix sur le canvas lui-même
    this.app.canvas.style.cursor = 'crosshair';

    this.worldView = new WorldView(this.app);
    this.buildingManager = new BuildingManager(this.app, this.worldView.world);
    this.buildingManager.setPlacementValidator((gx, gy, type) =>
      this.buildZoneSystem.canBuildAt(gx, gy, type.width, type.height)
    );
    this.buildingManager.setAffordabilityChecker((type) => this.money >= type.cost);
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
    this.peopleManager.setBaseInflux(this.attractionSnapshot.influxPerMinute);

    this.syncPeoplePool();

    this.districtSystem.generateZones();
    this.drawDistricts();
    this.drawBuildZone();
    this.recomputeAttraction();

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
      .fill({ color: 0x0ea5e9, alpha: 0.14 })
      .stroke({ width: 4, color: 0x38bdf8, alpha: 0.8 });

    this.buildZoneOverlay = g;
    this.worldView.world.addChild(g);
    this.worldView.setPanBounds({
      x: bounds.x * CELL_SIZE,
      y: bounds.y * CELL_SIZE,
      width: bounds.width * CELL_SIZE,
      height: bounds.height * CELL_SIZE,
    });
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

  private renderInspectionOverlay() {
    if (!this.inspectMode) return;
    this.clearInspectionOverlay();

    const overlay = new Graphics();
    overlay.zIndex = 1400;
    overlay.eventMode = 'none';

    const connectedRoads = this.computeConnectedRoadIds();
    this.buildingManager.getRoadBuildings().forEach((road) => {
      const isConnected = connectedRoads.has(road.state.instanceId);
      const color = isConnected ? 0x22c55e : 0xef4444;
      overlay
        .rect(
          road.gridX * CELL_SIZE,
          road.gridY * CELL_SIZE,
          road.widthCells * CELL_SIZE,
          road.heightCells * CELL_SIZE
        )
        .fill({ color, alpha: 0.18 })
        .stroke({ width: 2, color, alpha: 0.9 });
    });

    this.buildingManager
      .getBuildings()
      .filter((b) => !b.type.isRoad)
      .forEach((building) => {
        const efficiency = this.computeBuildingEfficiency(building);
        const color = this.blendColors(0xef4444, 0x22c55e, efficiency);
        overlay
          .rect(
            building.gridX * CELL_SIZE,
            building.gridY * CELL_SIZE,
            building.widthCells * CELL_SIZE,
            building.heightCells * CELL_SIZE
          )
          .fill({ color, alpha: 0.14 })
          .stroke({ width: 3, color, alpha: 0.9 });
      });

    this.inspectionOverlay = overlay;
    this.worldView.world.addChild(overlay);
    this.worldView.world.sortChildren();
  }

  private clearInspectionOverlay() {
    if (this.inspectionOverlay) {
      this.worldView.world.removeChild(this.inspectionOverlay);
      this.inspectionOverlay.destroy();
      this.inspectionOverlay = undefined;
    }
  }

  private computeConnectedRoadIds(): Set<string> {
    const roads = this.buildingManager.getRoadBuildings();
    if (roads.length === 0) return new Set();

    const visited = new Set<string>();
    const queue: Building[] = [];

    const first = roads[0];
    visited.add(first.state.instanceId);
    queue.push(first);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = this.buildingManager.getRoadNeighbors(current);
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor.state.instanceId)) {
          visited.add(neighbor.state.instanceId);
          queue.push(neighbor);
        }
      });
    }

    return visited;
  }

  private computeBuildingEfficiency(building: Building): number {
    const visitorLoad = building.getOccupancyRatioFor('visitor');
    const staffLoad = building.getOccupancyRatioFor('staff');
    const queueRatio = building.getQueueRatio();
    const satisfaction = Math.max(0, Math.min(1, building.getLastServiceSatisfaction() ?? 0.65));

    const baseScore = visitorLoad * 0.55 + staffLoad * 0.25 + satisfaction * 0.2;
    const penalty = queueRatio * 0.35;
    return Math.max(0, Math.min(1, baseScore - penalty));
  }

  private blendColors(from: number, to: number, t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    const r1 = (from >> 16) & 0xff;
    const g1 = (from >> 8) & 0xff;
    const b1 = from & 0xff;
    const r2 = (to >> 16) & 0xff;
    const g2 = (to >> 8) & 0xff;
    const b2 = to & 0xff;
    const r = Math.round(r1 + (r2 - r1) * clamped);
    const g = Math.round(g1 + (g2 - g1) * clamped);
    const b = Math.round(b1 + (b2 - b1) * clamped);
    return (r << 16) + (g << 8) + b;
  }

  private async preloadAssets(activePacks: string[] = []) {
    const packAssets: AssetDefinition[] = activePacks.flatMap((packId) =>
      Object.values(this.assetRegistry.packs?.[packId]?.assets ?? {})
    );
    const assets: AssetDefinition[] = [
      ...Object.values(this.assetRegistry.assets),
      ...packAssets,
    ];

    const uniqueAssets = new Map<string, AssetDefinition>();
    assets.forEach((asset) => uniqueAssets.set(asset.id, asset));

    uniqueAssets.forEach((asset) => {
      if (!Assets.get(asset.id)) {
        Assets.add({ alias: asset.id, src: asset.uri });
      }
    });

    await Assets.load(Array.from(uniqueAssets.keys()));
  }

  private onFrameUpdate = () => {
    this.simulation.step(
      this.app.ticker.deltaMS * Math.max(0.1, this.timeScale),
      this.isPaused
    );
  };

  private onSimulationTick = (ctx: TickContext) => {
    this.notificationCenter.prune(ctx.nowMs);
    const eventModifiers = this.eventSystem.update(ctx);

    this.selectedBuildingComputed = null;

    const timeAdvance = this.timeSystem.advance(ctx.deltaMs);
    if (timeAdvance.monthsAdvanced > 0) {
      for (let i = 0; i < timeAdvance.monthsAdvanced; i++) {
        this.debtSystem.markMissedPayment();
        this.debtSystem.processNewMonth(
          DEBT_SETTINGS.dueDay ?? TIME_SETTINGS.daysPerMonth ?? 30
        );

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
            queueLength: building.getQueueLength(),
            queueCapacity: building.getQueueCapacity(),
            lastServiceSatisfaction: building.getLastServiceSatisfaction(),
          };
        }

      for (let i = 0; i < completedCycles; i++) {
        this.harvestBuilding(
          building,
          skillSnapshot ?? undefined,
          eventModifiers.incomeMultiplier,
          districtMultiplier
        );
        building.completeServiceCycle();
      }
    });

    this.updateWorkerSchedules(ctx);

    this.peopleManager.setSpawnIntervalMultiplier(
      eventModifiers.spawnIntervalMultiplier
    );
    this.peopleManager.update(ctx);
    const visitorSentiment = this.computeVisitorSentiment();
    const visitorSaturation = this.computeVisitorSaturation();

    const { roaming: roamingGuards, stationed: stationedGuards } =
      this.recomputeGuardPresence();
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
    this.recomputeAttraction(visitorSentiment, visitorSaturation);

    const timeSnapshot = this.timeSystem.snapshotState();
    const debtEvents = this.buildDebtEvents(timeSnapshot);
    this.activeEvents = [...eventModifiers.activeEvents, ...debtEvents];
    this.evaluateNotifications(ctx, timeSnapshot, visitorSentiment);

    if (eventModifiers.moneyDelta !== 0) {
      this.money += eventModifiers.moneyDelta;
      if (eventModifiers.moneyDelta > 0) {
        this.economySystem.recordIncome(eventModifiers.moneyDelta, 'events');
      } else {
        this.economySystem.recordExpense(-eventModifiers.moneyDelta, 'events');
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
    this.economySystem.recordExpense(hiringCost, 'hiring');
    this.hiredWorkerIds.add(workerId);
    this.syncPeoplePool();
    this.emitState();
    return true;
  }

  public updateWorkerSlot(
    workerId: string,
    slotIndex: number,
    assignment: WorkerShiftAssignment
  ) {
    this.setWorkerSlotAssignment(workerId, slotIndex, assignment);
  }

  private syncPeoplePool() {
    this.refreshAvailableWorkers();
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
    if (this.inspectMode) {
      this.updateInspectHover(e.global);
    }
    if (!this.isPaintingRoad) return;
    this.paintRoadAtGlobal(e.global);
  }

  private stopRoadPainting() {
    if (!this.isPaintingRoad) return;
    this.isPaintingRoad = false;
    this.lastPaintedCell = null;
  }

  private updateInspectHover(globalPos: Point) {
    if (!this.inspectMode) return;

    const target = this.buildingManager.getBuildingAtGlobal(globalPos);
    if (!target) {
      if (this.inspectHover !== null) {
        this.inspectHover = null;
        this.emitState();
      }
      return;
    }

    const connectedRoads = this.computeConnectedRoadIds();

    if (target.type.isRoad) {
      const nextHover: InspectHoverSnapshot = {
        id: target.state.instanceId,
        label: 'Route',
        kind: 'road',
        connected: connectedRoads.has(target.state.instanceId),
      };
      if (
        !this.inspectHover ||
        this.inspectHover.id !== nextHover.id ||
        this.inspectHover.connected !== nextHover.connected ||
        this.inspectHover.kind !== nextHover.kind
      ) {
        this.inspectHover = nextHover;
        this.emitState();
      }
      return;
    }

    const efficiency = this.computeBuildingEfficiency(target);
    const adjacentConnected = this.buildingManager
      .getRoadNeighbors(target)
      .some((road) => connectedRoads.has(road.state.instanceId));

    const nextHover: InspectHoverSnapshot = {
      id: target.state.instanceId,
      label: target.type.name,
      kind: 'building',
      efficiency,
      connected: adjacentConnected,
    };

    if (
      !this.inspectHover ||
      this.inspectHover.id !== nextHover.id ||
      this.inspectHover.efficiency !== nextHover.efficiency ||
      this.inspectHover.connected !== nextHover.connected ||
      this.inspectHover.kind !== nextHover.kind
    ) {
      this.inspectHover = nextHover;
      this.emitState();
    }
  }

  public tryPlaceBuilding(globalPos: Point): boolean {
    if (this.isPaused) return false;

    const type = this.buildingManager.getDraggingMode();
    if (!type) return false;

    if (this.money < type.cost) {
      this.setPlacementHint(`Fonds insuffisants pour ${type.name}.`, true);
      this.emitPlacementTone('error');
      return false;
    }

    const success = this.buildingManager.tryPlaceBuildingAt(globalPos, type);
    if (success) {
      this.money -= type.cost;
      this.economySystem.recordExpense(type.cost, 'construction');
      this.setPlacementHint(null);
      this.emitState();
      this.emitPlacementTone('success');
      return true;
    }

    this.setPlacementHint('Emplacement bloqué : zone ou collision.', true);
    this.emitPlacementTone('error');
    return false;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.audioContext) return this.audioContext;
    const ContextCtor =
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ContextCtor) return null;
    this.audioContext = new ContextCtor();
    return this.audioContext;
  }

  private emitPlacementTone(kind: 'success' | 'error') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastPlacementToneAt < 140) {
      return;
    }
    this.lastPlacementToneAt = nowMs;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime;

    osc.type = kind === 'success' ? 'triangle' : 'sawtooth';
    osc.frequency.value = kind === 'success' ? 720 : 180;
    gain.gain.setValueAtTime(kind === 'success' ? 0.09 : 0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.3);
  }

  private setPlacementHint(message: string | null, emit: boolean = false) {
    if (this.placementHint === message) return;
    this.placementHint = message;
    if (emit) {
      this.emitState();
    }
  }

  public expandBuildZone(): boolean {
    const cost = this.buildZoneSystem.getNextExpansionCost();
    if (this.money < cost) return false;

    const expanded = this.buildZoneSystem.tryExpand();
    if (!expanded) return false;

    this.money -= cost;
    this.economySystem.recordExpense(cost, 'expansion');
    this.drawBuildZone();
    this.emitState();
    return true;
  }

  public payDebt(): boolean {
    const outstanding = this.debtSystem.getOutstandingPayment();
    if (outstanding <= 0) return false;
    if (this.money < outstanding) return false;

    const paid = this.debtSystem.payCurrentDebt();
    if (paid <= 0) return false;

    this.money -= paid;
    this.economySystem.recordExpense(paid, 'debt');
    this.emitState();
    return true;
  }

  public grantTutorialReward(amount: number): number {
    if (amount <= 0) return 0;
    this.money += amount;
    this.economySystem.recordIncome(amount, 'events');
    this.emitState();
    return amount;
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
    this.economySystem.recordIncome(income, 'operations');
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

    const typeCost = type.cost;
    const hadFunds = this.money >= typeCost;

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
      this.economySystem.recordExpense(spent, 'construction');
      this.setPlacementHint(null);
      this.emitState();
      this.emitPlacementTone('success');
    } else if (!hadFunds) {
      this.setPlacementHint('Fonds insuffisants pour tracer une route.', true);
      this.emitPlacementTone('error');
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
    if (!type) {
      this.setPlacementHint(null);
    }
    this.emitState();
  }

  public setInspectMode(enabled: boolean) {
    if (this.inspectMode === enabled) return;
    this.inspectMode = enabled;
    if (!enabled) {
      this.clearInspectionOverlay();
      this.inspectHover = null;
    } else {
      this.renderInspectionOverlay();
    }
    this.emitState();
  }

  public async applyAssetPacks(packIds: string[], silent: boolean = false) {
    const validPackIds = (packIds ?? []).filter((id) =>
      Boolean(this.assetRegistry.packs?.[id])
    );
    this.assetRegistry.activePackIds = validPackIds;
    this.spriteResolver.setActivePacks(validPackIds);
    await this.preloadAssets(validPackIds);
    if (!silent) {
      this.emitState();
    }
  }

  public upgradeSelectedBuilding() {
    if (!this.selectedBuilding || this.isPaused) return;
    const b = this.selectedBuilding;
    if (b.type.isRoad) return;

    const cost = calculateUpgradeCost(b.type, b.state.level);

    if (this.money >= cost && b.state.level < b.type.maxLevel) {
      this.money -= cost;
      this.economySystem.recordExpense(cost, 'construction');

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

  public setTimeMultiplier(multiplier: number) {
    this.timeScale = Math.max(0.1, Math.min(multiplier, 4));
    this.emitState();
  }

  public setTimeMode(mode: 'pause' | 'normal' | 'fast') {
    if (mode === 'pause') {
      this.pause();
      return;
    }

    this.timeScale = mode === 'fast' ? 3 : 1;
    const wasPaused = this.isPaused;
    this.resume();
    if (!wasPaused) {
      this.emitState();
    }
  }

  public focusBuilding(instanceId: string): boolean {
    const building = this.buildingManager
      .getBuildings()
      .find((b) => b.state.instanceId === instanceId);
    if (!building) return false;

    const center = building.getCenterGlobalPosition();
    this.worldView.focusOn(center);
    this.selectBuilding(building);
    return true;
  }

  public acknowledgeNotification(id: string) {
    this.notificationCenter.dismiss(id);
    this.activeNotifications = this.notificationCenter.snapshot();
    this.emitState();
  }

  public getSelectedBuildingScreenPosition(): Point | null {
    if (!this.selectedBuilding) return null;
    return this.selectedBuilding.getCenterGlobalPosition();
  }

  private recomputeGuardPresence() {
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
    return this.guardPresence;
  }

  private initWorkerSchedules() {
    WORKER_ROSTER.forEach((worker) => {
      if (this.workerSchedules.has(worker.id)) return;
      this.workerSchedules.set(worker.id, {
        workerId: worker.id,
        slots: createDefaultSchedule(worker),
        fatigue: 0.18,
        hunger: 0.12,
        morale: 0.76,
      });
    });
  }

  private hydrateWorkerSchedules(saved?: PersistedWorkerSchedule[]) {
    this.workerSchedules.clear();
    if (saved && saved.length > 0) {
      saved.forEach((state) => {
        this.workerSchedules.set(state.workerId, {
          workerId: state.workerId,
          slots: state.slots.map((slot) => ({ ...slot })),
          fatigue: this.clamp01(state.fatigue),
          hunger: this.clamp01(state.hunger),
          morale: this.clamp01(state.morale),
        });
      });
    }

    this.initWorkerSchedules();
  }

  private findCurrentSlotIndex(slots: WorkerScheduleSlot[], hour: number) {
    const normalizedHour = ((hour % 24) + 24) % 24;
    const index = slots.findIndex(
      (slot) => normalizedHour >= slot.startHour && normalizedHour < slot.endHour
    );
    return index >= 0 ? index : 0;
  }

  private updateWorkerSchedules(ctx: TickContext) {
    const time = this.timeSystem.snapshotState();
    const hoursDelta = ctx.deltaMs / TIME_SETTINGS.msPerHour;

    this.workerSchedules.forEach((state) => {
      const slotIndex = this.findCurrentSlotIndex(state.slots, time.hour);
      const slot = state.slots[slotIndex] ?? state.slots[0];

      switch (slot.assignment) {
        case 'primary':
        case 'secondary':
          state.fatigue = this.clamp01(state.fatigue + 0.12 * hoursDelta);
          state.hunger = this.clamp01(state.hunger + 0.09 * hoursDelta);
          state.morale = this.clamp01(state.morale - 0.03 * hoursDelta);
          break;
        case 'service':
          state.fatigue = this.clamp01(state.fatigue - 0.06 * hoursDelta);
          state.hunger = this.clamp01(state.hunger - 0.12 * hoursDelta);
          state.morale = this.clamp01(state.morale + 0.02 * hoursDelta);
          break;
        case 'rest':
        default:
          state.fatigue = this.clamp01(state.fatigue - 0.1 * hoursDelta);
          state.hunger = this.clamp01(state.hunger - 0.04 * hoursDelta);
          state.morale = this.clamp01(state.morale + 0.015 * hoursDelta);
          break;
      }

      if (state.fatigue > 0.88) {
        state.morale = this.clamp01(state.morale - 0.04 * hoursDelta);
      }
    });

    this.refreshAvailableWorkers(time.hour);
  }

  private computeEfficiencyModifier(state: WorkerScheduleState) {
    const fatiguePenalty = state.fatigue * 0.4;
    const hungerPenalty = state.hunger * 0.25;
    const moraleBonus = (state.morale - 0.5) * 0.2;
    return this.clamp(Math.round((1 - fatiguePenalty - hungerPenalty + moraleBonus) * 100) / 100, 0.6, 1.25);
  }

  private buildWorkerScheduleSnapshots(time: TimeSnapshot) {
    return Array.from(this.workerSchedules.values())
      .map((state) => {
        if (!this.hiredWorkerIds.has(state.workerId)) return null;
        const worker = WORKER_ROSTER.find((w) => w.id === state.workerId);
        if (!worker) return null;

        const slotIndex = this.findCurrentSlotIndex(state.slots, time.hour);
        const slot = state.slots[slotIndex] ?? state.slots[0];
        const efficiencyModifier = this.computeEfficiencyModifier(state);
        const cautionLabel =
          state.fatigue >= 0.9
            ? 'Épuisée'
            : state.hunger >= 0.9
            ? 'Affamée'
            : undefined;

        return {
          workerId: state.workerId,
          name: worker.identity?.firstName ?? state.workerId,
          primaryJob: worker.jobs.primary,
          secondaryJobs: [...worker.jobs.secondary],
          currentAssignment: slot.assignment,
          currentSlotIndex: slotIndex,
          fatigue: Number(state.fatigue.toFixed(3)),
          hunger: Number(state.hunger.toFixed(3)),
          morale: Number(state.morale.toFixed(3)),
          efficiencyModifier,
          cautionLabel,
          slots: state.slots.map((s) => ({
            startHour: s.startHour,
            endHour: s.endHour,
            label: s.label ?? `${s.startHour}h-${s.endHour}h`,
            assignment: s.assignment,
          })),
        };
      })
      .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));
  }

  private refreshAvailableWorkers(currentHour?: number) {
    const timeHour = currentHour ?? this.timeSystem.snapshotState().hour;
    const activeWorkers: Worker[] = [];
    this.hiredWorkerIds.forEach((workerId) => {
      const worker = WORKER_ROSTER.find((w) => w.id === workerId);
      if (!worker) return;

      const schedule = this.workerSchedules.get(workerId);
      if (!schedule) return;

      const slotIndex = this.findCurrentSlotIndex(schedule.slots, timeHour);
      const slot = schedule.slots[slotIndex] ?? schedule.slots[0];
      const isActive =
        (slot.assignment === 'primary' || slot.assignment === 'secondary') &&
        schedule.fatigue < 0.95 &&
        schedule.hunger < 0.95;

      if (isActive) {
        activeWorkers.push(worker);
      }
    });

    this.peopleManager.setAvailableWorkers(activeWorkers);
  }

  private setWorkerSlotAssignment(
    workerId: string,
    slotIndex: number,
    assignment: WorkerShiftAssignment
  ) {
    const schedule = this.workerSchedules.get(workerId);
    if (!schedule) return;
    if (slotIndex < 0 || slotIndex >= schedule.slots.length) return;

    schedule.slots[slotIndex] = {
      ...schedule.slots[slotIndex],
      assignment,
    };

    this.refreshAvailableWorkers();
    this.emitState();
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private clamp01(value: number) {
    return this.clamp(value, 0, 1);
  }

  private buildDebtEvents(timeSnapshot: TimeSnapshot): ActiveEventSnapshot[] {
    const debt = this.debtSystem.snapshotState();
    if (debt.isPaidForMonth) return [];

    const daysUntilDue = debt.dueDay - timeSnapshot.day;
    const msPerDay = this.timeSystem.getMsPerDay();
    const remainingMs = Math.max(0, (daysUntilDue + 1) * msPerDay);

    if (daysUntilDue < 0) {
      return [
        {
          id: 'debt-due',
          instanceId: -1,
          title: 'Échéance de dette dépassée',
          description: `Le paiement de ${debt.paymentDue.toLocaleString('fr-FR')}€ n’a pas été effectué.`,
          remainingMs: msPerDay,
          durationMs: msPerDay,
          severity: 'critical',
          effects: {},
        },
      ];
    }

    if (daysUntilDue <= 3) {
      return [
        {
          id: 'debt-warning',
          instanceId: -2,
          title: 'Paiement de dette imminent',
          description: `Échéance dans ${daysUntilDue} jour(s). Montant dû : ${debt.paymentDue.toLocaleString('fr-FR')}€.`,
          remainingMs,
          durationMs: remainingMs,
          severity: 'warning',
          effects: {},
        },
      ];
    }

    return [];
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

  private computeBuildingStats(): BuildingStatsSnapshot {
    const stats: BuildingStatsSnapshot = {
      total: 0,
      roads: 0,
      byCategory: {},
    };

    this.buildingManager.getBuildings().forEach((building) => {
      stats.total += 1;
      if (building.type.isRoad) {
        stats.roads += 1;
      }
      const category = building.type.category ?? 'unknown';
      stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1;
    });

    return stats;
  }

  private computeVisitorSentiment() {
    const active = this.peopleManager.getVisitorSatisfaction();
    const settledVisitors = this.buildingManager
      .getBuildings()
      .flatMap((building) => building.getVisitors());

    const settledTotal = settledVisitors.reduce(
      (sum, visitor) => sum + (visitor.satisfaction ?? 0.5),
      0
    );

    const totalSamples = active.count + settledVisitors.length;
    if (totalSamples === 0) {
      return { average: 0.5, samples: 0 };
    }

    const weightedAverage =
      (active.average * active.count + settledTotal) / totalSamples;

    return { average: weightedAverage, samples: totalSamples };
  }

  private computeVisitorSaturation() {
    const aggregated = this.buildingManager
      .getBuildings()
      .filter((b) => !b.type.isRoad && b.type.capacity > 0)
      .reduce(
        (acc, building) => {
          acc.capacity += building.getCapacityForRole('visitor');
          acc.occupants += building.getOccupantsByRole().visitor ?? 0;
          return acc;
        },
        { capacity: 0, occupants: 0 }
      );

    if (aggregated.capacity <= 0) {
      return { ratio: 0, capacity: 0, occupants: 0 };
    }

    const ratio = Math.min(1, aggregated.occupants / aggregated.capacity);
    return { ratio, capacity: aggregated.capacity, occupants: aggregated.occupants };
  }

  private evaluateNotifications(
    ctx: TickContext,
    timeSnapshot: TimeSnapshot,
    visitorSentiment: ReturnType<Game['computeVisitorSentiment']>
  ) {
    const debt = this.debtSystem.snapshotState();
    if (!debt.isPaidForMonth) {
      const daysUntilDue = debt.dueDay - timeSnapshot.day;
      const severity = daysUntilDue < 0 ? 'critical' : 'warning';
      const dueLabel =
        daysUntilDue < 0
          ? `Retard de ${Math.abs(daysUntilDue)} jour(s)`
          : daysUntilDue === 0
            ? "Échéance aujourd'hui"
            : `Échéance dans ${daysUntilDue} jour(s)`;
      this.notificationCenter.raise(
        {
          key: daysUntilDue < 0 ? `debt-overdue-${debt.monthIndex}` : `debt-due-${debt.monthIndex}`,
          title: severity === 'critical' ? 'Dette en retard' : 'Paiement de dette imminent',
          message: `${dueLabel} · ${debt.paymentDue.toLocaleString('fr-FR')}€ à régler.`,
          severity,
          action: { type: 'show-debt' },
          actionLabel: 'Voir',
          cooldownMs: this.timeSystem.getMsPerDay(),
        },
        ctx.nowMs
      );
    }

    if (visitorSentiment.samples > 3 && visitorSentiment.average < 0.5) {
      const percent = Math.round(visitorSentiment.average * 100);
      const severity = visitorSentiment.average < 0.35 ? 'critical' : 'warning';
      this.notificationCenter.raise(
        {
          key: severity === 'critical' ? 'satisfaction-critical' : 'satisfaction-warning',
          title: 'Satisfaction moyenne faible',
          message: `Moyenne actuelle ${percent}% sur ${visitorSentiment.samples} visiteurs actifs.`,
          severity,
          action: { type: 'show-satisfaction' },
          actionLabel: 'Voir',
          cooldownMs: 20000,
        },
        ctx.nowMs
      );
    }

    this.trackBuildingSaturation(ctx.nowMs);
    this.activeNotifications = this.notificationCenter.snapshot();
  }

  private trackBuildingSaturation(nowMs: number) {
    const seen = new Set<string>();
    const saturationThresholdMs = 30000;

    this.buildingManager.getBuildings().forEach((building) => {
      if (building.type.isRoad) return;

      const visitorCap = building.getCapacityForRole('visitor');
      const queueCap = building.getQueueCapacity();
      if (visitorCap <= 0 && queueCap <= 0) return;

      const isSaturated =
        (visitorCap > 0 && building.getOccupancyRatioFor('visitor') >= 1) ||
        (queueCap > 0 && building.getQueueRatio() >= 1);
      const key = building.state.instanceId;
      seen.add(key);

      if (isSaturated) {
        const tracker = this.buildingSaturationTracker.get(key);
        if (!tracker) {
          this.buildingSaturationTracker.set(key, { startedAt: nowMs, lastSeen: nowMs });
        } else {
          tracker.lastSeen = nowMs;
          if (nowMs - tracker.startedAt >= saturationThresholdMs) {
            this.notificationCenter.raise(
              {
                key: `saturation-${key}`,
                title: `${building.type.name} saturé`,
                message:
                  'Capacité et file sont pleines depuis 30s. Les visiteurs repartent insatisfaits.',
                severity: 'warning',
                action: { type: 'focus-building', buildingId: key },
                actionLabel: 'Voir',
                cooldownMs: 45000,
              },
              nowMs
            );
            tracker.startedAt = nowMs + 1;
          }
        }
      } else {
        this.buildingSaturationTracker.delete(key);
      }
    });

    Array.from(this.buildingSaturationTracker.keys()).forEach((key) => {
      if (!seen.has(key)) {
        this.buildingSaturationTracker.delete(key);
      }
    });
  }

  private broadcastReputationChange(reputation: ReputationSnapshot) {
    if (typeof window === 'undefined') return;

    if (this.lastReputationBroadcast) {
      const deltaLocal = Math.abs(this.lastReputationBroadcast.local - reputation.local);
      const deltaPremium = Math.abs(
        this.lastReputationBroadcast.premium - reputation.premium
      );
      const deltaRegulation = Math.abs(
        this.lastReputationBroadcast.regulatoryPressure - reputation.regulatoryPressure
      );
      if (deltaLocal < 0.05 && deltaPremium < 0.05 && deltaRegulation < 0.05) {
        return;
      }
    }

    this.lastReputationBroadcast = { ...reputation };
    window.dispatchEvent(
      new CustomEvent('reputation-changed', {
        detail: {
          reputation: { ...reputation },
          notoriety: this.attractionSnapshot.notoriety,
          timestamp: Date.now(),
        },
      })
    );
  }

  private recomputeAttraction(
    visitorSentiment: ReturnType<Game['computeVisitorSentiment']>,
    visitorSaturation: ReturnType<Game['computeVisitorSaturation']>
  ) {
    const reputationSnapshot = this.reputationSystem.snapshot();
    this.attractionSnapshot = this.attractionSystem.update({
      reputation: reputationSnapshot,
      averageSatisfaction: visitorSentiment.average,
      saturationRatio: visitorSaturation.ratio,
    });
    this.peopleManager.setBaseInflux(this.attractionSnapshot.influxPerMinute);
  }

  private getHiredWorkerTemplates(): Worker[] {
    return Array.from(this.hiredWorkerIds.values())
      .map((id) => WORKER_ROSTER.find((w) => w.id === id))
      .filter((w): w is Worker => Boolean(w));
  }

  private emitState() {
    const { occupantsByType, movingPeopleCount, peopleByRole, occupantsByRole } =
      this.computeGlobalStats();
    const buildingStats = this.computeBuildingStats();
    const reputation = this.reputationSystem.snapshot();
    const time = this.timeSystem.snapshotState();

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

    const economy = this.economySystem.snapshot(time.day);
    const districts = this.districtSystem.snapshot(
      this.buildingManager.getBuildings()
    );
    const buildZone = this.buildZoneSystem.snapshot();
    this.broadcastReputationChange(reputation);

    if (this.inspectMode) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - this.lastInspectionRenderMs > 350) {
        this.renderInspectionOverlay();
        this.lastInspectionRenderMs = now;
      }
    }

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
      timeScale: this.timeScale,
      movingPeopleCount,
      occupantsByType,
      peopleByRole,
      occupantsByRole,
      reputation,
      zoom: this.worldView.getScale(),
      activeEvents: this.activeEvents,
      time,
      debt: this.debtSystem.snapshotState(),
      security: this.securitySnapshot,
      guardPresence: this.guardPresence,
      hiredWorkers: Array.from(this.hiredWorkerIds.values()),
      hiredByJob,
      economy,
      districts,
      buildZone,
      activeAssetPacks: [...(this.assetRegistry.activePackIds ?? [])],
      attraction: this.attractionSnapshot,
      workerSchedules: this.buildWorkerScheduleSnapshots(time),
      notifications: this.activeNotifications,
      inspectMode: this.inspectMode,
      inspectHover: this.inspectHover,
      buildingStats,
      placementHint: this.placementHint,
    });
  }

  public getSavePayload(): GameSaveState {
    const timeSnapshot = this.timeSystem.snapshotState();
    const economySnapshot = this.economySystem.snapshot(timeSnapshot.day);
    const buildingSnapshots: PersistedBuildingState[] = this.buildingManager
      .getBuildings()
      .map((building) => ({
        gridX: building.gridX,
        gridY: building.gridY,
        typeId: building.type.id,
        state: { ...building.state, incomeProgressMs: building.getIncomeProgressMs() },
        staffIds: building.getStaffMembers().map((worker) => worker.id),
        visitorCount: building.getOccupantsByRole().visitor ?? 0,
      }));

    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      money: this.money,
      totalClicks: this.totalClicks,
      buildings: buildingSnapshots,
      hiredWorkers: Array.from(this.hiredWorkerIds.values()),
      time: timeSnapshot,
      debt: this.debtSystem.snapshotState(),
      economy: economySnapshot,
      reputation: this.reputationSystem.snapshot(),
      security: this.securitySnapshot,
      buildZone: this.buildZoneSystem.snapshot(),
      districts: this.districtSystem.getZones(),
      events: this.eventSystem.snapshot(),
      simulation: this.simulation.snapshotState(),
      activeAssetPacks: [...(this.assetRegistry.activePackIds ?? [])],
      people: this.peopleManager.snapshot(),
      workerSchedules: Array.from(this.workerSchedules.values()).map(
        (state) => ({
          workerId: state.workerId,
          slots: state.slots.map((slot) => ({ ...slot })),
          fatigue: state.fatigue,
          hunger: state.hunger,
          morale: state.morale,
        })
      ),
    };
  }

  public async loadFromSave(save: GameSaveState): Promise<boolean> {
    await this.whenReady();
    if (!save || save.version !== SAVE_VERSION) return false;

    this.pause();
    this.notificationCenter.reset();
    this.activeNotifications = [];
    this.buildingSaturationTracker.clear();
    this.inspectMode = false;
    this.inspectHover = null;
    this.placementHint = null;
    this.clearInspectionOverlay();
    this.money = save.money;
    this.totalClicks = save.totalClicks;
    this.hiredWorkerIds = new Set(save.hiredWorkers);
    this.hydrateWorkerSchedules(save.workerSchedules);
    this.refreshAvailableWorkers();

    this.simulation.hydrate(save.simulation);
    this.timeSystem.hydrate(save.time);
    this.debtSystem.hydrate(save.debt);
    this.economySystem.hydrate(save.economy);
    this.reputationSystem.hydrate(save.reputation);
    this.securitySystem.hydrate(save.security);
    this.securitySnapshot = { ...save.security };
    this.buildZoneSystem.hydrate(save.buildZone);
    this.districtSystem.hydrateZones(save.districts);
    this.drawBuildZone();
    this.drawDistricts();

    this.eventSystem.hydrate(save.events);
    this.activeEvents = save.events.active;
    await this.applyAssetPacks(save.activeAssetPacks ?? [], true);

    this.peopleManager.resetPeople();

    const workerCatalog = new Map<string, Worker>();
    WORKER_ROSTER.forEach((worker) => workerCatalog.set(worker.id, worker));
    this.buildingManager.hydrateBuildings(save.buildings, workerCatalog);
    this.peopleManager.hydrate(save.people);

    this.refreshAvailableWorkers();
    this.recomputeAttraction();
    this.recomputeGuardPresence();
    this.selectedBuilding = null;
    this.selectedPerson = null;
    this.isPaused = false;
    this.pauseStartedAt = null;
    this.timeScale = 1;
    this.emitState();

    return true;
  }

  public destroy() {
    this.buildZoneOverlay?.destroy();
    this.districtOverlay?.destroy();
    this.clearInspectionOverlay();
    this.worldView.destroy();
    this.app.destroy(true, { children: true });
  }
}
