import { Application, Container, Sprite, Texture } from 'pixi.js';

export class IncomePulse extends Container {
  private readonly sprite: Sprite;
  private readonly start = performance.now();
  private readonly duration = 520;
  private readonly baseScale: number;
  private readonly app: Application;

  constructor(app: Application, x: number, y: number, baseScale = 1) {
    super();
    this.app = app;
    this.x = x;
    this.y = y;
    this.baseScale = baseScale;

    this.sprite = new Sprite({ texture: Texture.from('income_pulse') });
    this.sprite.anchor.set(0.5);
    this.sprite.alpha = 0.85;
    this.sprite.scale.set(baseScale * 0.6);
    this.addChild(this.sprite);

    this.app.stage.addChild(this);
    this.app.ticker.add(this.update, this);
  }

  private update() {
    const elapsed = performance.now() - this.start;
    const progress = Math.min(elapsed / this.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2);

    this.sprite.scale.set(this.baseScale * (0.6 + eased * 0.9));
    this.sprite.alpha = 0.85 * (1 - eased);

    if (progress >= 1) {
      this.app.ticker.remove(this.update, this);
      this.destroy({ children: true });
    }
  }
}
