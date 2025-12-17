import { Application, Container, Point } from 'pixi.js';
import { CELL_SIZE, PersonRole } from '../types/types';
import { Building } from './Building';
import { BuildingManager } from './BuildingManager';
import { Person } from './Person';
import { TickContext } from './SimulationClock';
import { SpriteResolver } from './assets/SpriteResolver';
import { PersonFactory } from './data/person-factory';
import { SelectedPersonSnapshot } from '@/types/ui';
import { DecisionAI, EntryDecision } from './decision/DecisionAI';
import { Visitor, Worker } from '@/types/data-contract';
import { BuildingState } from '@/types/types';
import { PersistedPeopleState, PersistedPersonState } from '@/types/save';

type PersonBehavior =
  | { kind: 'wander' }
  | { kind: 'patrol'; basePath: Point[] }
  | { kind: 'entering'; targetInstanceId: string };

export class PeopleManager {
  private app: Application;
  private world: Container;
  private buildingManager: BuildingManager;
  private spriteResolver: SpriteResolver;
  private personFactory: PersonFactory;
  private onPersonSelected?: (selected: SelectedPersonSnapshot) => void;
  private onPersonRemoved?: (id: string) => void;
  private decisionAI: DecisionAI;

  private people: Person[] = [];
  private availableWorkers: Worker[] = [];
  private elapsedSinceSpawn = 0;
  private readonly baseSpawnIntervalMs = 4000;
  private spawnIntervalMultiplier = 1;

  private lastTileKey = new Map<Person, string>();
  private behaviors = new Map<string, PersonBehavior>();

  constructor(
    app: Application,
    world: Container,
    buildingManager: BuildingManager,
    spriteResolver: SpriteResolver,
    onPersonSelected?: (selected: SelectedPersonSnapshot) => void,
    onPersonRemoved?: (id: string) => void
  ) {
    this.app = app;
    this.world = world;
    this.buildingManager = buildingManager;
    this.spriteResolver = spriteResolver;
    this.personFactory = new PersonFactory();
    this.onPersonSelected = onPersonSelected;
    this.onPersonRemoved = onPersonRemoved;
    this.decisionAI = new DecisionAI();
  }

  public update(ctx: TickContext) {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();

    this.elapsedSinceSpawn += ctx.deltaMs;

    const spawnIntervalMs = this.getCurrentSpawnInterval();

    while (this.elapsedSinceSpawn >= spawnIntervalMs) {
      if (this.trySpawnPerson()) {
        this.elapsedSinceSpawn -= spawnIntervalMs;
      } else {
        // avoid tight loop when spawn conditions unmet
        this.elapsedSinceSpawn = 0;
        break;
      }
    }

    for (const p of this.people) {
      this.maybeTryEnterAdjacentBuilding(p);
    }
  }

  public pauseAll() {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();
    this.people.forEach((p) => p.setPaused(true));
  }

  public resetPeople() {
    this.people.forEach((p) => p.destroy());
    this.people = [];
    this.lastTileKey.clear();
    this.elapsedSinceSpawn = 0;
    this.behaviors.clear();
  }

  public resumeAll() {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();
    this.people.forEach((p) => p.setPaused(false));
  }

  public getPeopleCount(): number {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();
    return this.people.length;
  }

  public setSpawnIntervalMultiplier(multiplier: number): void {
    const safeMultiplier = Math.max(0.25, Math.min(multiplier, 4));
    this.spawnIntervalMultiplier = safeMultiplier;
  }

  public setAvailableWorkers(workers: Worker[]) {
    this.availableWorkers = workers;
  }

  private trySpawnPerson(): boolean {
    const roads = this.buildingManager.getRoadBuildings();
    if (roads.length < 2) return false;

    const endpoints = roads.filter(
      (r) => this.buildingManager.getRoadNeighbors(r).length === 1
    );
    if (endpoints.length < 2) return false;

    const start =
      endpoints[Math.floor(Math.random() * endpoints.length)];
    let end: Building | null = null;
    while (!end || end === start) {
      end = endpoints[Math.floor(Math.random() * endpoints.length)];
    }

    const directPath = this.findPath(start, end);
    if (!directPath || directPath.length < 2) return false;

    let finalPath = directPath;

    const candidates = roads.filter(
      (b) => b !== start && b !== end && !directPath.includes(b)
    );

    if (candidates.length > 0) {
      const via =
        candidates[Math.floor(Math.random() * candidates.length)];

      const pathToVia = this.findPath(start, via);
      const pathFromVia = this.findPath(via, end);

      if (
        pathToVia &&
        pathFromVia &&
        pathToVia.length >= 2 &&
        pathFromVia.length >= 2
      ) {
        const merged = [...pathToVia, ...pathFromVia.slice(1)];
        if (merged.length > directPath.length) {
          finalPath = merged;
        }
      }
    }

    if (!finalPath || finalPath.length < 2) return false;

    const pathPoints = finalPath.map(
      (b) => new Point(b.x, b.y)
    );

    const role = this.pickRole();
    if (role === 'staff' && this.availableWorkers.length === 0) {
      return false;
    }

    const profile =
      role === 'staff'
        ? this.personFactory.createWorkerFromTemplate(
            this.availableWorkers[
              Math.floor(Math.random() * this.availableWorkers.length)
            ]
          )
        : this.personFactory.createVisitor();

    const person = new Person(
      this.app,
      pathPoints,
      role,
      profile,
      this.spriteResolver,
      {
        onSelected: () => {
          if (this.onPersonSelected) {
            this.onPersonSelected({
              id: person.getId(),
              role: person.role,
              profile,
            });
          }
        },
      }
    );

    if (role === 'staff' && this.isGuard(profile)) {
      this.setGuardPatrolBehavior(person, pathPoints);
    } else {
      this.behaviors.set(person.getId(), { kind: 'wander' });
    }
    person.zIndex = 1000;
    this.world.addChild(person);
    this.people.push(person);
    return true;
  }

  private isGuard(profile: Visitor | Worker): profile is Worker {
    return 'jobs' in profile && profile.jobs.primary === 'guard';
  }

  private findPath(start: Building, end: Building): Building[] | null {
    if (start === end) return [start];

    const queue: Building[] = [start];
    const visited = new Set<Building>([start]);
    const parent = new Map<Building, Building>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end) break;

      const neighbors = this.buildingManager.getRoadNeighbors(current);
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          parent.set(nb, current);
          queue.push(nb);
        }
      }
    }

    if (!visited.has(end)) return null;

    const path: Building[] = [];
    let cur: Building | undefined = end;
    while (cur) {
      path.unshift(cur);
      const p = parent.get(cur);
      if (!p) break;
      cur = p;
      if (cur === start) {
        path.unshift(start);
        break;
      }
    }
    return path;
  }

  private maybeTryEnterAdjacentBuilding(person: Person) {
    const gx = Math.round(person.x / CELL_SIZE);
    const gy = Math.round(person.y / CELL_SIZE);
    const key = `${gx},${gy}`;

    if (this.lastTileKey.get(person) === key) return;
    this.lastTileKey.set(person, key);

    const road = this.buildingManager.getRoadBuildingAt(gx, gy);
    if (!road) return;

    const candidates =
      this.buildingManager.getAdjacentNonRoadBuildings(gx, gy);
    if (candidates.length === 0) return;

    const chance = 0.25;
    if (Math.random() > chance) return;

    const target =
      person.role === 'staff'
        ? this.pickStaffDecision(person.getProfile() as Worker, candidates)
        : this.pickVisitorDecision(person.getProfile() as Visitor, candidates);

    if (!target) return;

    const desire = target.desire;
    if (Math.random() > desire) return;

    const roadCenter = new Point(road.x, road.y);
    const buildingCenter = new Point(target.building.x, target.building.y);
    const currentPos = person.position.clone();

    // trajet "classique" : position actuelle → centre de la route → centre du bâtiment
    const path: Point[] = [currentPos, roadCenter, buildingCenter];

    this.setEnteringBehavior(person, target.building.state, path);
  }

  private pickRole(): PersonRole {
    if (this.availableWorkers.length === 0) return 'visitor';
    const roll = Math.random();
    return roll < 0.7 ? 'visitor' : 'staff';
  }

  private getCurrentSpawnInterval(): number {
    const interval = this.baseSpawnIntervalMs * this.spawnIntervalMultiplier;
    return Math.max(800, interval);
  }

  private pickStaffDecision(
    worker: Worker,
    candidates: Building[]
  ): EntryDecision | null {
    return this.decisionAI.chooseBuildingForWorker(worker, candidates);
  }

  private pickVisitorDecision(
    visitor: Visitor,
    candidates: Building[]
  ): EntryDecision | null {
    return this.decisionAI.chooseBuildingForVisitor(visitor, candidates);
  }

  private cleanupBehaviors() {
    const alive = new Set(this.people.map((p) => p.getId()));
    for (const id of this.behaviors.keys()) {
      if (!alive.has(id)) {
        this.behaviors.delete(id);
      }
    }
  }

  private setGuardPatrolBehavior(person: Person, basePath: Point[]) {
    const guardPath = basePath.map((p) => p.clone());
    this.behaviors.set(person.getId(), { kind: 'patrol', basePath: guardPath });

    let reverse = false;
    const assignNext = () => {
      const nextPath = reverse ? [...guardPath].reverse() : guardPath;
      reverse = !reverse;
      person.setPath(nextPath);
    };

    person.setOnFinished(() => {
      assignNext();
      return true;
    });
  }

  private setEnteringBehavior(person: Person, building: BuildingState, path: Point[]) {
    this.behaviors.set(person.getId(), {
      kind: 'entering',
      targetInstanceId: building.instanceId,
    });

    person.setPath(path, () => {
      const target = this.buildingManager
        .getBuildings()
        .find((b) => b.state.instanceId === building.instanceId);

      if (target) {
        target.addOccupant(person.role, person.getProfile());
      }

      this.lastTileKey.delete(person);
      if (this.onPersonRemoved) {
        this.onPersonRemoved(person.getId());
      }
      person.destroy();
    });
  }

  public getPeopleCountByRole(): Record<PersonRole, number> {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();
    return this.people.reduce(
      (acc, person) => {
        acc[person.role] += 1;
        return acc;
      },
      { visitor: 0, staff: 0 } as Record<PersonRole, number>
    );
  }

  public getWorkersByJob(): Record<string, number> {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();
    return this.people.reduce<Record<string, number>>((acc, person) => {
      if (person.role !== 'staff') return acc;
      const profile = person.getProfile();
      if ('jobs' in profile) {
        const jobId = profile.jobs.primary;
        acc[jobId] = (acc[jobId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }

  public snapshot(): PersistedPeopleState {
    this.people = this.people.filter((p) => !p.destroyed);
    this.cleanupBehaviors();

    return {
      elapsedSinceSpawn: this.elapsedSinceSpawn,
      spawnIntervalMultiplier: this.spawnIntervalMultiplier,
      persons: this.people.map((person) => this.serializePerson(person)),
    };
  }

  private serializePerson(person: Person): PersistedPersonState {
    const pathState = person.getPathState();
    const behavior = this.behaviors.get(person.getId()) ?? { kind: 'wander' };

    return {
      id: person.getId(),
      role: person.role,
      profile: person.getProfile(),
      path: this.persistPath(pathState.path),
      segmentIndex: pathState.segmentIndex,
      segmentProgress: pathState.segmentProgress,
      paused: pathState.paused,
      behavior:
        behavior.kind === 'patrol'
          ? {
              kind: 'patrol',
              basePath: this.persistPath(behavior.basePath),
            }
          : behavior.kind === 'entering'
            ? { kind: 'entering', targetInstanceId: behavior.targetInstanceId }
            : { kind: 'wander' },
    };
  }

  private persistPath(points: Point[]) {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }

  public hydrate(snapshot: PersistedPeopleState | undefined) {
    this.resetPeople();

    if (!snapshot) {
      return;
    }

    this.elapsedSinceSpawn = snapshot.elapsedSinceSpawn ?? 0;
    this.spawnIntervalMultiplier = snapshot.spawnIntervalMultiplier ?? 1;

    (snapshot.persons ?? []).forEach((personState) => {
      const pathPoints = personState.path.map((node) => new Point(node.x, node.y));

      const person = new Person(
        this.app,
        pathPoints,
        personState.role,
        personState.profile,
        this.spriteResolver,
        {
          onSelected: () => {
            if (this.onPersonSelected) {
              this.onPersonSelected({
                id: person.getId(),
                role: person.role,
                profile: person.getProfile(),
              });
            }
          },
          id: personState.id,
        }
      );

      this.world.addChild(person);
      this.people.push(person);

      this.restoreBehavior(person, personState, pathPoints);

      person.restorePathState({
        path: pathPoints,
        segmentIndex: personState.segmentIndex,
        segmentProgress: personState.segmentProgress,
        paused: personState.paused,
      });
    });
  }

  private restoreBehavior(
    person: Person,
    personState: PersistedPersonState,
    pathPoints: Point[]
  ) {
    if (personState.behavior.kind === 'patrol') {
      const basePath = personState.behavior.basePath.map(
        (node) => new Point(node.x, node.y)
      );
      this.setGuardPatrolBehavior(person, basePath);
      return;
    }

    if (personState.behavior.kind === 'entering') {
      const targetBuilding = this.buildingManager
        .getBuildings()
        .find((b) => b.state.instanceId === personState.behavior.targetInstanceId);

      if (targetBuilding) {
        this.setEnteringBehavior(person, targetBuilding.state, pathPoints);
      } else {
        this.behaviors.set(person.getId(), { kind: 'wander' });
      }

      return;
    }

    this.behaviors.set(person.getId(), { kind: 'wander' });
  }
}
