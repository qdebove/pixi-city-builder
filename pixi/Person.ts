import { Application, Container, Graphics, Point, Ticker } from 'pixi.js';

export class Person extends Container {
  private app: Application;
  private path: Point[];
  private segmentIndex = 0;   // index du point de départ du segment
  private segmentProgress = 0; // 0 → début du segment, 1 → fin
  private speed = 60;         // px / seconde
  private paused = false;

  constructor(app: Application, path: Point[]) {
    super();
    this.app = app;
    this.path = path;

    const g = new Graphics();
    g.circle(0, 0, 6).fill(0xf9a8d4).stroke({ width: 2, color: 0x1f2933 });
    this.addChild(g);
    this.zIndex = 1000;

    if (path.length > 0) {
      this.position.copyFrom(path[0]);
    }

    this.app.ticker.add(this.update, this);
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
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

    // progression sur le segment courant
    const moveT = (this.speed * dt) / dist;
    this.segmentProgress += moveT;

    // clamp dans [0, 1] pour éviter tout overshoot / “tilt”
    if (this.segmentProgress >= 1) {
      this.segmentProgress = 1;
    }

    const t = this.segmentProgress;
    this.position.set(from.x + dx * t, from.y + dy * t);

    // si on est au bout du segment, on passe au suivant
    if (this.segmentProgress >= 1) {
      this.advanceSegment();
    }
  }

  private advanceSegment() {
    this.segmentIndex++;
    this.segmentProgress = 0;

    if (this.segmentIndex >= this.path.length - 1) {
      // arrivé au bout du chemin
      this.finish();
    } else {
      // on se snap exactement sur le prochain point pour éviter les décalages flottants
      this.position.copyFrom(this.path[this.segmentIndex]);
    }
  }

  private finish() {
    this.app.ticker.remove(this.update, this);
    this.destroy();
  }

  public destroy(options?: any) {
    this.app.ticker.remove(this.update, this);
    super.destroy(options);
  }
}
