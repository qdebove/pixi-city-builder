import { Application, Container, Point } from 'pixi.js';
import { BuildingManager } from './BuildingManager';
import { Person } from './Person';

export class PeopleManager {
  private app: Application;
  private world: Container;
  private buildingManager: BuildingManager;

  private people: Person[] = [];
  private lastSpawnTime = performance.now();
  private readonly SPAWN_INTERVAL_MS = 4000;

  constructor(
    app: Application,
    world: Container,
    buildingManager: BuildingManager
  ) {
    this.app = app;
    this.world = world;
    this.buildingManager = buildingManager;
  }

  public update(now: number) {
    if (now - this.lastSpawnTime >= this.SPAWN_INTERVAL_MS) {
      if (this.trySpawnPerson()) {
        this.lastSpawnTime = now;
      }
    }
  }

  public shiftTimers(deltaMs: number) {
    this.lastSpawnTime += deltaMs;
  }

  public pauseAll() {
    this.people.forEach((p) => p.setPaused(true));
  }

  public resumeAll() {
    this.people = this.people.filter((p) => !p.destroyed);
    this.people.forEach((p) => p.setPaused(false));
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
    let end: typeof start | null = null;
    while (!end || end === start) {
      end = endpoints[Math.floor(Math.random() * endpoints.length)];
    }

    const pathBuildings = this.findPath(start, end);
    if (!pathBuildings || pathBuildings.length < 2) return false;

    const pathPoints = pathBuildings.map(
      (b) => new Point(b.x, b.y) // centres déjà en coordonnées monde
    );

    const person = new Person(this.app, pathPoints);
    this.world.addChild(person);
    this.people.push(person);

    return true;
  }

  // BFS simple sur le graphe des routes
  private findPath(start: any, end: any): any[] | null {
    const queue: any[] = [start];
    const visited = new Set<any>([start]);
    const parent = new Map<any, any>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end) break;

      for (const nb of this.buildingManager.getRoadNeighbors(current)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          parent.set(nb, current);
          queue.push(nb);
        }
      }
    }

    if (!visited.has(end)) return null;

    const path: any[] = [];
    let cur: any = end;
    while (cur) {
      path.unshift(cur);
      cur = parent.get(cur);
      if (cur === start) {
        path.unshift(start);
        break;
      }
    }
    return path;
  }
}
