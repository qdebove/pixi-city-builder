import { Application, Container, Point } from 'pixi.js';
import { CELL_SIZE } from '../types/types';
import { Building } from './Building';
import { BuildingManager } from './BuildingManager';
import { Person } from './Person';

export class PeopleManager {
  private app: Application;
  private world: Container;
  private buildingManager: BuildingManager;

  private people: Person[] = [];
  private lastSpawnTime = performance.now();
  private readonly SPAWN_INTERVAL_MS = 4000;

  private lastTileKey = new Map<Person, string>();

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
    this.people = this.people.filter((p) => !p.destroyed);

    if (now - this.lastSpawnTime >= this.SPAWN_INTERVAL_MS) {
      if (this.trySpawnPerson()) {
        this.lastSpawnTime = now;
      }
    }

    for (const p of this.people) {
      this.maybeTryEnterAdjacentBuilding(p);
    }
  }

  public shiftTimers(deltaMs: number) {
    this.lastSpawnTime += deltaMs;
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

    const person = new Person(this.app, pathPoints);
    person.zIndex = 1000;
    this.world.addChild(person);
    this.people.push(person);

    return true;
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

    const available = candidates.filter(
      (b) => b.state.currentOccupants < b.type.capacity
    );
    if (available.length === 0) return;

    const target =
      available[Math.floor(Math.random() * available.length)];

    const roadCenter = new Point(road.x, road.y);
    const buildingCenter = new Point(target.x, target.y);
    const currentPos = person.position.clone();

    // trajet "classique" : position actuelle → centre de la route → centre du bâtiment
    const path: Point[] = [currentPos, roadCenter, buildingCenter];

    person.setPath(path, () => {
      target.updateState({
        currentOccupants: target.state.currentOccupants + 1,
      });
      this.lastTileKey.delete(person);
      person.destroy();
    });
  }
}
