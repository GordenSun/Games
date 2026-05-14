import { CanvasGame } from "../canvasGame.js";
import { bestNumber, getValue, setValue } from "../storage.js";
import { clamp, drawImageCentered, formatTime, pointInRect } from "../math.js";

const CHECKPOINTS = [
  { x: 455, y: 82, w: 60, h: 130 },
  { x: 745, y: 245, w: 130, h: 60 },
  { x: 455, y: 375, w: 60, h: 130 },
  { x: 85, y: 245, w: 130, h: 60 },
];

export default class Racer extends CanvasGame {
  constructor(options) {
    super(options);
    this.reset();
  }

  reset() {
    this.car = { x: 485, y: 430, angle: -Math.PI / 2, speed: 0 };
    this.lap = 0;
    this.nextCheckpoint = 0;
    this.time = 0;
    this.finished = false;
    this.penalty = 0;
  }

  update(dt) {
    if (this.input.pressed("KeyR")) this.reset();
    if (this.finished) return;
    this.time += dt;
    const accel = this.input.down("ArrowUp", "KeyW") ? 260 : 0;
    const brake = this.input.down("ArrowDown", "KeyS") ? 230 : 0;
    const turn = (this.input.down("ArrowRight", "KeyD") ? 1 : 0) - (this.input.down("ArrowLeft", "KeyA") ? 1 : 0);
    this.car.speed += (accel - brake) * dt;
    this.car.speed *= this.onRoad(this.car.x, this.car.y) ? 0.988 : 0.94;
    this.car.speed = clamp(this.car.speed, -90, 360);
    this.car.angle += turn * dt * (1.8 + Math.abs(this.car.speed) / 170) * Math.sign(this.car.speed || 1);
    this.car.x += Math.cos(this.car.angle) * this.car.speed * dt;
    this.car.y += Math.sin(this.car.angle) * this.car.speed * dt;
    this.car.x = clamp(this.car.x, 35, this.width - 35);
    this.car.y = clamp(this.car.y, 35, this.height - 35);
    this.checkProgress();
    this.setHud(`
      <div><strong>圈数</strong> ${Math.min(3, this.lap)} / 3</div>
      <div><strong>时间</strong> ${formatTime(this.time + this.penalty)}</div>
      <div><strong>速度</strong> ${Math.round(Math.abs(this.car.speed))}</div>
      <div><strong>下个检查点</strong> ${this.nextCheckpoint + 1}</div>
      <div><strong>最佳</strong> ${getValue("best:racer", "暂无")}</div>
    `);
  }

  onRoad(x, y) {
    const outer = x > 80 && x < 880 && y > 70 && y < 500;
    const inner = x > 250 && x < 710 && y > 190 && y < 380;
    return outer && !inner;
  }

  checkProgress() {
    const cp = CHECKPOINTS[this.nextCheckpoint];
    if (pointInRect(this.car, cp)) {
      this.nextCheckpoint = (this.nextCheckpoint + 1) % CHECKPOINTS.length;
      if (this.nextCheckpoint === 0) {
        this.lap += 1;
        if (this.lap >= 3) {
          this.finished = true;
          const result = formatTime(this.time + this.penalty);
          setValue("best:racer:last", result);
          const bestRaw = getValue("best:racerSeconds", null);
          if (bestRaw == null || this.time + this.penalty < bestRaw) {
            bestNumber("best:racerSeconds", this.time + this.penalty, "min");
            setValue("best:racer", result);
          }
        }
      }
    }
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#315f35";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#2b3038";
    roundRect(ctx, 80, 70, 800, 430, 130);
    ctx.fill();
    ctx.fillStyle = "#315f35";
    roundRect(ctx, 250, 190, 460, 190, 75);
    ctx.fill();
    for (let x = 110; x < 850; x += 96) {
      ctx.drawImage(this.assets.road, x, 82, 82, 82);
      ctx.drawImage(this.assets.road, x, 407, 82, 82);
    }
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 18]);
    ctx.strokeRect(105, 95, 750, 380);
    ctx.setLineDash([]);
    CHECKPOINTS.forEach((cp, index) => {
      ctx.fillStyle = index === this.nextCheckpoint ? "rgba(78,231,255,.34)" : "rgba(255,255,255,.08)";
      ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
    });
    ctx.drawImage(this.assets.cone, 205, 160, 34, 42);
    ctx.drawImage(this.assets.oil, 735, 350, 48, 32);
    ctx.drawImage(this.assets.barrier, 520, 66, 88, 32);
    ctx.drawImage(this.assets.tree, 165, 250, 62, 78);
    ctx.drawImage(this.assets.tree, 742, 185, 62, 78);
    drawImageCentered(ctx, this.assets.car, this.car.x, this.car.y, 48, 82, this.car.angle + Math.PI / 2);
    if (!this.onRoad(this.car.x, this.car.y)) {
      ctx.fillStyle = "rgba(255,105,97,.86)";
      ctx.fillText("越野减速", 24, 38);
    }
    if (this.finished) this.overlayText("冲线完成！", [`总时间 ${formatTime(this.time + this.penalty)}`, "按 R 或点击“重新开始”"]);
    if (this.paused) this.overlayText("已暂停", ["按 Esc 或点击继续"]);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
