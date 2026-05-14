export class CanvasGame {
  constructor({ canvas, input, assets, hud, meta }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.assets = assets;
    this.hud = hud;
    this.meta = meta;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.lastTime = 0;
    this.raf = 0;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame((time) => this.frame(time));
  }

  frame(time) {
    if (!this.running) return;
    const dt = Math.min(0.033, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    if (this.input.pressed("Escape")) this.togglePause();
    if (!this.paused) this.update(dt);
    this.render(this.ctx);
    this.input.endFrame();
    this.raf = requestAnimationFrame((next) => this.frame(next));
  }

  update() {}

  render() {}

  restart() {
    this.destroy();
  }

  togglePause(force) {
    this.paused = typeof force === "boolean" ? force : !this.paused;
  }

  setHud(html) {
    if (this.hud) this.hud.innerHTML = html;
  }

  overlayText(title, lines = []) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(3, 8, 16, 0.72)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eef8ff";
    ctx.font = "30px 'Kenney Future', sans-serif";
    ctx.fillText(title, this.width / 2, this.height / 2 - 20);
    ctx.font = "17px Inter, sans-serif";
    ctx.fillStyle = "#9fb8ce";
    lines.forEach((line, index) => ctx.fillText(line, this.width / 2, this.height / 2 + 18 + index * 26));
    ctx.restore();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
