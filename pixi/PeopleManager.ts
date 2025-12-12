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

    // extrémités = routes avec exactement 1 voisin route
    const endpoints = roads.filter(
      (r) => this.buildingManager.getRoadNeighbors(r).length === 1
    );
    if (endpoints.length < 2) return false;

    // 1. choisir start / end parmi les endpoints
    const start =
      endpoints[Math.floor(Math.random() * endpoints.length)];
    let end: typeof start | null = null;
    while (!end || end === start) {
      end = endpoints[Math.floor(Math.random() * endpoints.length)];
    }

    // 2. chemin direct le plus court
    const directPath = this.findPath(start, end);
    if (!directPath || directPath.length < 2) return false;

    let finalPath = directPath;

    // 3. tentative de détour via une case route intermédiaire
    //    (qui n'est ni start, ni end, ni déjà dans le chemin direct)
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
        // on concatène start -> via -> end
        // en évitant de doubler le noeud 'via'
        const merged = [...pathToVia, ...pathFromVia.slice(1)];

        // si le chemin via est plus long que le direct, c'est bien un détour -> on l'utilise
        if (merged.length > directPath.length) {
          finalPath = merged;
        }
      }
    }

    if (!finalPath || finalPath.length < 2) return false;

    const pathPoints = finalPath.map(
      (b) => new Point(b.x, b.y) // centres déjà en coordonnées monde
    );

    const person = new Person(this.app, pathPoints);
    this.world.addChild(person);
    this.people.push(person);

    return true;
  }

  // BFS simple sur le graphe des routes
  private findPath(start: any, end: any): any[] | null {
    if (start === end) return [start];

    const queue: any[] = [start];
    const visited = new Set<any>([start]);
    const parent = new Map<any, any>();

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
