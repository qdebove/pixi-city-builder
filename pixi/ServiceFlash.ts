import { Application, Container, Sprite, Texture } from 'pixi.js';

export class ServiceFlash extends Container {
  private readonly sprite: Sprite;
  private readonly start = performance.now();
  private readonly duration = 900;
  private readonly app: Application;

  constructor(app: Application, texture: Texture, x: number, y: number) {
    super();
    this.app = app;
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.alpha = 0.95;
    this.sprite.scale.set(0.7);
    this.x = x;
    this.y = y;

    this.addChild(this.sprite);
    this.zIndex = 1200;
    this.app.stage.addChild(this);
    this.app.ticker.add(this.update, this);
  }

  private update() {
    const elapsed = performance.now() - this.start;
    const ratio = Math.min(1, elapsed / this.duration);
    const eased = 1 - Math.pow(1 - ratio, 2);

    this.sprite.alpha = 0.95 * (1 - eased);
    this.sprite.y = -12 * eased;
    this.sprite.scale.set(0.7 + eased * 0.2);

    if (ratio >= 1) {
      this.app.ticker.remove(this.update, this);
      this.destroy({ children: true });
    }
  }
}
