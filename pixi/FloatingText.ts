import { Application, Container, Text, TextStyle } from 'pixi.js';

// Style unique, doré, compatible avec ta version de Pixi
const GOLD_TEXT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 28,
  fontWeight: 'bold',
  fill: '#fbbf24',            // <- une seule couleur, plus de tableau
  stroke: '#000000',
  dropShadow: {
    color: '#000000',
    blur: 4,
    angle: Math.PI / 6,
    distance: 2,
  }
});

export class FloatingText extends Container {
  private app: Application;
  private textElement: Text;
  private readonly DURATION = 1000;
  private startTime: number;
  private startY: number;

  constructor(app: Application, amount: number, x: number, y: number) {
    super();
    this.app = app;

    // Léger random pour ne pas avoir tous les textes superposés
    this.x = x + (Math.random() * 20 - 10);
    this.y = y - 20;
    this.startY = this.y;
    this.startTime = performance.now();

    this.textElement = new Text(`+${amount}€`, GOLD_TEXT_STYLE);
    this.textElement.anchor.set(0.5);
    this.addChild(this.textElement);

    this.app.stage.addChild(this);
    this.app.ticker.add(this.update, this);
  }

  private update() {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / this.DURATION, 1);

    const ease = 1 - Math.pow(1 - progress, 3);

    this.y = this.startY - 100 * ease;
    this.alpha = 1 - Math.pow(progress, 3);

    if (progress >= 1) {
      this.app.ticker.remove(this.update, this);
      this.destroy({ children: true });
    }
  }
}
