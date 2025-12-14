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
    this.people.forEach((p) => p.setPaused(true));
  }

  public resumeAll() {
    this.people = this.people.filter((p) => !p.destroyed);
    this.people.forEach((p) => p.setPaused(false));
  }

  public getPeopleCount(): number {
    this.people = this.people.filter((p) => !p.destroyed);
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
      let reverse = false;
      const assignNext = () => {
        const nextPath = reverse ? [...pathPoints].reverse() : pathPoints;
        reverse = !reverse;
        person.setPath(nextPath);
      };
      person.setOnFinished(() => {
        assignNext();
        return true;
      });
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

    person.setPath(path, () => {
      target.building.addOccupant(person.role, person.getProfile());
      this.lastTileKey.delete(person);
      if (this.onPersonRemoved) {
        this.onPersonRemoved(person.getId());
      }
      person.destroy();
    });
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

  public getPeopleCountByRole(): Record<PersonRole, number> {
    this.people = this.people.filter((p) => !p.destroyed);
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
}
