import { Application, Container, Text, TextStyle } from 'pixi.js';

export class FloatingText extends Container {
  private app: Application;
  private textElement: Text;
  private readonly DURATION = 800;
  private startTime: number;
  private startY: number;

  constructor(app: Application, amount: number, x: number, y: number) {
    super();
    this.app = app;

    this.x = x + (Math.random() * 10 - 5);
    this.y = y - 10;
    this.startY = this.y;
    this.startTime = performance.now();

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16, // ✅ plus petit
      fontWeight: 'bold',
      fill: '#fbbf24', // or doux
      stroke: { color: '#000000', width: 2 },
      dropShadow: {
        color: '#000000',
        blur: 2,
        angle: Math.PI / 6,
        distance: 1,
      },
    });

    this.textElement = new Text({ text: `+${amount}€`, style });
    this.textElement.anchor.set(0.5);
    this.addChild(this.textElement);

    app.stage.addChild(this);
    app.ticker.add(this.update, this);
  }

  private update() {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / this.DURATION, 1);

    const ease = 1 - Math.pow(1 - progress, 3);

    this.y = this.startY - 40 * ease;
    this.alpha = 1 - ease;

    if (progress >= 1) {
      this.app.ticker.remove(this.update, this);
      this.destroy({ children: true });
    }
  }
}
