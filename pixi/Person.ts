import {
  Application,
  Container,
  Graphics,
  IDestroyOptions,
  Point,
  Sprite,
  Texture,
  Ticker,
} from 'pixi.js';
import { SpriteVariant } from '../types/data-contract';
import { PersonRole } from '../types/types';
import { SpriteResolver } from './assets/SpriteResolver';

interface PersonContext {
  id: string;
  role: PersonRole;
  variant: SpriteVariant;
}

type FinishCallback = () => void;

export class Person extends Container {
  private app: Application;
  private path: Point[];
  private segmentIndex = 0;
  private segmentProgress = 0;
  private speed = 60; // px/s
  private paused = false;
  private onFinished: FinishCallback | null = null;
  public readonly role: PersonRole;
  private readonly spriteResolver: SpriteResolver;
  private readonly id: string;
  private variant: SpriteVariant = 'move';

  private visual: Sprite | Graphics;

  constructor(
    app: Application,
    path: Point[],
    role: PersonRole,
    spriteResolver: SpriteResolver,
    onFinished?: FinishCallback
  ) {
    super();
    this.app = app;
    this.path = this.normalizePath(path);
    this.role = role;
    this.spriteResolver = spriteResolver;
    this.id = crypto.randomUUID();
    this.onFinished = onFinished || null;

    const fallbackVisual = new Graphics();
    const color = role === 'visitor' ? 0xf9a8d4 : 0x38bdf8;
    fallbackVisual
      .circle(0, 0, 6)
      .fill(color)
      .stroke({ width: 2, color: 0x1f2933 });
    this.visual = fallbackVisual;
    this.addChild(this.visual);
    this.refreshVisual('move');

    if (this.path.length > 0) {
      this.position.copyFrom(this.path[0]);
    }

    this.app.ticker.add(this.update, this);
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    this.refreshVisual(paused ? 'idle' : 'move');
  }

  /**
   * Définit un nouveau chemin complet à suivre (peut contenir des diagonales en entrée,
   * elles seront converties en segments horizontaux/verticaux).
   */
  public setPath(points: Point[], onFinished?: FinishCallback) {
    if (points.length < 2) return;
    this.path = this.normalizePath(points);
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.refreshVisual('move');
    if (onFinished) {
      this.onFinished = onFinished;
    }
  }

  /**
   * Helper simple pour aller de la position actuelle à une cible.
   */
  public setPathFromCurrent(target: Point, onFinished?: FinishCallback) {
    this.setPath([this.position.clone(), target], onFinished);
  }

  /**
   * Transforme un chemin potentiellement diagonal en chemin Manhattan :
   * chaque saut diagonal est remplacé par 2 segments orthogonaux.
   */
  private normalizePath(points: Point[]): Point[] {
    if (points.length <= 1) return points;

    const result: Point[] = [];
    result.push(points[0].clone());

    for (let i = 1; i < points.length; i++) {
      const prev = result[result.length - 1];
      const cur = points[i];

      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;

      if (dx !== 0 && dy !== 0) {
        // On force un "L" : horizontal puis vertical (ou inverse)
        const mid = new Point(cur.x, prev.y);
        result.push(mid, cur.clone());
      } else {
        result.push(cur.clone());
      }
    }

    return result;
  }

  private refreshVisual(variant: SpriteVariant) {
    if (this.variant === variant && this.visual instanceof Sprite) {
      return;
    }

    this.variant = variant;
    const requestEntity: PersonContext = {
      id: this.id,
      role: this.role,
      variant,
    };

    const target = this.role === 'staff' ? 'worker' : 'visitor';
    const resolved = this.spriteResolver.resolve({
      kind: 'sprite',
      target,
      entity: requestEntity,
      variant,
      seedKey: this.id,
    });

    if (!resolved) return;

    const texture = Texture.from(resolved.assetId);
    const sprite = new Sprite({ texture });
    sprite.anchor.set(0.5);
    if (resolved.meta?.scale) {
      sprite.scale.set(resolved.meta.scale);
    }

    this.removeChild(this.visual);
    this.visual.destroy({ texture: false, baseTexture: false });
    this.visual = sprite;
    this.addChild(sprite);
  }

  private update(ticker: Ticker) {
    if (this.paused) return;
    if (this.path.length < 2) return;

    const dt = ticker.deltaMS / 1000;
    if (dt <= 0) return;

    const from = this.path[this.segmentIndex];
    const to = this.path[this.segmentIndex + 1];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      this.advanceSegment();
      return;
    }

    const moveT = (this.speed * dt) / dist;
    this.segmentProgress += moveT;
    if (this.segmentProgress >= 1) {
      this.segmentProgress = 1;
    }

    const t = this.segmentProgress;
    this.position.set(from.x + dx * t, from.y + dy * t);

    if (this.segmentProgress >= 1) {
      this.advanceSegment();
    }
  }

  private advanceSegment() {
    this.segmentIndex++;
    this.segmentProgress = 0;

    if (this.segmentIndex >= this.path.length - 1) {
      this.finish();
    } else {
      this.position.copyFrom(this.path[this.segmentIndex]);
    }
  }

  private finish() {
    this.app.ticker.remove(this.update, this);
    if (this.onFinished) {
      this.onFinished();
    } else {
      this.destroy();
    }
  }

  public destroy(options?: boolean | IDestroyOptions) {
    this.app.ticker.remove(this.update, this);
    super.destroy(options);
  }
}
