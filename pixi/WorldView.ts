import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Ticker,
} from 'pixi.js';
import { CELL_SIZE, GRID_SIZE } from '../types/types';

export class WorldView {
  public world: Container;
  private app: Application;

  private panStart: Point | null = null;
  private worldStart: Point | null = null;

  private readonly keyboardPanState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private readonly keyboardPanSpeed = 520;

  private readonly MIN_SCALE = 0.15;
  private readonly MAX_SCALE = 4.0;

  private panBounds: { x: number; y: number; width: number; height: number } | null =
    null;

  constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);

    this.drawGrid();
    this.setupControls();
    this.centerWorld();
  }

  private drawGrid() {
    const g = new Graphics();
    g.rect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE).fill({
      color: 0x000000,
      alpha: 0,
    });

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      const isMajorLine = i % 5 === 0;
      const stroke = {
        width: isMajorLine ? 1.5 : 1,
        color: isMajorLine ? 0x94a3b8 : 0x475569,
        alpha: isMajorLine ? 0.45 : 0.28,
      } as const;
      g.moveTo(pos, 0)
        .lineTo(pos, GRID_SIZE * CELL_SIZE)
        .stroke(stroke);
      g.moveTo(0, pos)
        .lineTo(GRID_SIZE * CELL_SIZE, pos)
        .stroke(stroke);
    }
    this.world.addChild(g);
  }

  private centerWorld() {
    const bounds =
      this.panBounds ??
      ({
        x: 0,
        y: 0,
        width: GRID_SIZE * CELL_SIZE,
        height: GRID_SIZE * CELL_SIZE,
      } as const);
    this.centerOnBounds(bounds);
  }

  private setupControls() {
    this.app.canvas.addEventListener('contextmenu', this.preventContextMenu);

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointerdown', this.onPointerDown);
    this.app.stage.on('pointermove', this.onPointerMove);
    this.app.stage.on('pointerup', this.onPointerUp);

    this.app.canvas.addEventListener('wheel', this.onWheel, {
      passive: false,
    });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.app.ticker.add(this.updateKeyboardPan);

    // ✅ curseur toujours en croix
    this.app.canvas.style.cursor = 'crosshair';
  }

  private onPointerDown = (e: FederatedPointerEvent) => {
    if (e.button === 2) {
      this.panStart = e.global.clone();
      this.worldStart = new Point(this.world.x, this.world.y);
      // on ne change plus le curseur
    }
  };

  private onPointerMove = (e: FederatedPointerEvent) => {
    if (this.panStart && this.worldStart) {
      const dx = e.global.x - this.panStart.x;
      const dy = e.global.y - this.panStart.y;
      this.world.x = this.worldStart.x + dx;
      this.world.y = this.worldStart.y + dy;
      this.clampWorldPosition();
    }
  };

  private onPointerUp = (e: FederatedPointerEvent) => {
    if (e.button === 2) {
      this.panStart = null;
      this.worldStart = null;
      // rien : le curseur reste en croix
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

    const mousePos = { x: e.clientX, y: e.clientY };
    const worldPosBefore = {
      x: (mousePos.x - this.world.x) / this.world.scale.x,
      y: (mousePos.y - this.world.y) / this.world.scale.y,
    };

    let newScale = this.world.scale.x * direction;
    newScale = Math.max(this.MIN_SCALE, Math.min(newScale, this.MAX_SCALE));

    this.world.scale.set(newScale);

    this.world.x = mousePos.x - worldPosBefore.x * newScale;
    this.world.y = mousePos.y - worldPosBefore.y * newScale;
    this.clampWorldPosition();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    let handled = false;
    switch (event.key) {
      case 'ArrowUp':
        this.keyboardPanState.up = true;
        handled = true;
        break;
      case 'ArrowDown':
        this.keyboardPanState.down = true;
        handled = true;
        break;
      case 'ArrowLeft':
        this.keyboardPanState.left = true;
        handled = true;
        break;
      case 'ArrowRight':
        this.keyboardPanState.right = true;
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        this.keyboardPanState.up = false;
        break;
      case 'ArrowDown':
        this.keyboardPanState.down = false;
        break;
      case 'ArrowLeft':
        this.keyboardPanState.left = false;
        break;
      case 'ArrowRight':
        this.keyboardPanState.right = false;
        break;
      default:
        break;
    }
  };

  private updateKeyboardPan = (ticker: Ticker) => {
    const dx = (this.keyboardPanState.right ? 1 : 0) - (this.keyboardPanState.left ? 1 : 0);
    const dy = (this.keyboardPanState.down ? 1 : 0) - (this.keyboardPanState.up ? 1 : 0);
    if (dx === 0 && dy === 0) return;

    const deltaSeconds = ticker.deltaMS / 1000;
    const zoomFactor = Math.max(this.world.scale.x, this.MIN_SCALE);
    const step = (this.keyboardPanSpeed / zoomFactor) * deltaSeconds;

    this.world.x += dx * step;
    this.world.y += dy * step;
    this.clampWorldPosition();
  };

  private preventContextMenu = (e: Event) => {
    e.preventDefault();
  };

  public getScale(): number {
    return this.world.scale.x;
  }

  public setPanBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    this.panBounds = bounds;
    this.centerOnBounds(bounds);
    this.clampWorldPosition();
  }

  private centerOnBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    this.world.x = this.app.screen.width / 2 - centerX * this.world.scale.x;
    this.world.y = this.app.screen.height / 2 - centerY * this.world.scale.y;
  }

  private clampWorldPosition() {
    if (!this.panBounds) return;

    const scale = this.world.scale.x;
    const bounds = this.panBounds;

    const minX = this.app.screen.width - (bounds.x + bounds.width) * scale;
    const maxX = -bounds.x * scale;
    const minY = this.app.screen.height - (bounds.y + bounds.height) * scale;
    const maxY = -bounds.y * scale;

    if (minX > maxX) {
      this.world.x = (minX + maxX) / 2;
    } else {
      this.world.x = Math.min(Math.max(this.world.x, minX), maxX);
    }

    if (minY > maxY) {
      this.world.y = (minY + maxY) / 2;
    } else {
      this.world.y = Math.min(Math.max(this.world.y, minY), maxY);
    }
  }

  public destroy() {
    this.app.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.app.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.app.stage.off('pointerdown', this.onPointerDown);
    this.app.stage.off('pointermove', this.onPointerMove);
    this.app.stage.off('pointerup', this.onPointerUp);
    this.app.ticker.remove(this.updateKeyboardPan);
  }
}
