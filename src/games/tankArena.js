import { CanvasGame } from "../canvasGame.js";
import { bestNumber, getValue } from "../storage.js";
import { clamp, drawImageCentered, dist, rectsOverlap } from "../math.js";

export default class TankArena extends CanvasGame {
  constructor(options) {
    super(options);
    this.reset();
  }

  reset() {
    this.wave = 1;
    this.score = 0;
    this.player = { x: 120, y: 120, w: 54, h: 54, angle: 0, hp: 5, cooldown: 0 };
    this.bullets = [];
    this.explosions = [];
    this.obstacles = [
      { x: 260, y: 120, w: 54, h: 54, kind: "crate", hp: 2 },
      { x: 500, y: 250, w: 58, h: 58, kind: "barrel", hp: 1 },
      { x: 720, y: 120, w: 64, h: 50, kind: "sandbag", hp: 999 },
      { x: 190, y: 405, w: 64, h: 50, kind: "sandbag", hp: 999 },
      { x: 610, y: 410, w: 54, h: 54, kind: "crate", hp: 2 },
    ];
    this.spawnWave();
  }

  spawnWave() {
    const count = Math.min(6, this.wave + 2);
    this.enemies = Array.from({ length: count }, (_, i) => ({
      x: 650 + (i % 2) * 160,
      y: 110 + Math.floor(i / 2) * 130,
      w: 54,
      h: 54,
      angle: Math.PI,
      hp: 2 + Math.floor(this.wave / 3),
      cooldown: 0.6 + i * 0.2,
      kind: ["enemyRed", "enemyGreen", "enemyDark"][i % 3],
    }));
  }

  update(dt) {
    if (this.input.pressed("KeyR")) this.reset();
    if (this.player.hp <= 0) return;
    this.player.cooldown -= dt;
    const mx = (this.input.down("ArrowRight", "KeyD") ? 1 : 0) - (this.input.down("ArrowLeft", "KeyA") ? 1 : 0);
    const my = (this.input.down("ArrowDown", "KeyS") ? 1 : 0) - (this.input.down("ArrowUp", "KeyW") ? 1 : 0);
    this.moveTank(this.player, mx * 190 * dt, my * 190 * dt);
    this.player.angle = Math.atan2(this.input.pointer.y - this.player.y, this.input.pointer.x - this.player.x) + Math.PI / 2;
    if ((this.input.down("Space") || this.input.pointer.clicked) && this.player.cooldown <= 0) this.shoot(this.player, "player");
    this.updateEnemies(dt);
    this.updateBullets(dt);
    if (this.enemies.length === 0) {
      this.wave += 1;
      bestNumber("best:tankWave", this.wave, "max");
      this.spawnWave();
    }
    this.setHud(`
      <div><strong>波次</strong> ${this.wave}</div>
      <div><strong>分数</strong> ${this.score}</div>
      <div><strong>装甲</strong> ${"■".repeat(Math.max(0, this.player.hp))}</div>
      <div><strong>最高波次</strong> ${getValue("best:tankWave", 1)}</div>
    `);
  }

  moveTank(tank, dx, dy) {
    tank.x = clamp(tank.x + dx, 28, this.width - 28);
    if (this.obstacles.some((o) => rectsOverlap({ x: tank.x - 25, y: tank.y - 25, w: 50, h: 50 }, o))) tank.x -= dx;
    tank.y = clamp(tank.y + dy, 28, this.height - 28);
    if (this.obstacles.some((o) => rectsOverlap({ x: tank.x - 25, y: tank.y - 25, w: 50, h: 50 }, o))) tank.y -= dy;
  }

  shoot(tank, owner) {
    tank.cooldown = owner === "player" ? 0.35 : 0.9;
    const angle = tank.angle - Math.PI / 2;
    this.bullets.push({
      x: tank.x + Math.cos(angle) * 34,
      y: tank.y + Math.sin(angle) * 34,
      vx: Math.cos(angle) * 410,
      vy: Math.sin(angle) * 410,
      r: 7,
      owner,
    });
  }

  updateEnemies(dt) {
    this.enemies.forEach((enemy) => {
      enemy.cooldown -= dt;
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      enemy.angle = angle + Math.PI / 2;
      const far = dist(enemy.x, enemy.y, this.player.x, this.player.y) > 210;
      this.moveTank(enemy, Math.cos(angle) * (far ? 75 : -25) * dt, Math.sin(angle) * (far ? 75 : -25) * dt);
      if (enemy.cooldown <= 0) this.shoot(enemy, "enemy");
    });
  }

  updateBullets(dt) {
    this.bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) b.dead = true;
      for (const o of this.obstacles) {
        if (!b.dead && rectsOverlap({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, o)) {
          b.dead = true;
          o.hp -= 1;
          if (o.hp <= 0) o.dead = true;
          this.explosions.push({ x: b.x, y: b.y, t: 0.25 });
        }
      }
      if (b.owner === "player") {
        for (const e of this.enemies) {
          if (!b.dead && dist(b.x, b.y, e.x, e.y) < 34) {
            b.dead = true;
            e.hp -= 1;
            if (e.hp <= 0) {
              e.dead = true;
              this.score += 120;
              bestNumber("best:tankScore", this.score, "max");
            }
          }
        }
      } else if (dist(b.x, b.y, this.player.x, this.player.y) < 34) {
        b.dead = true;
        this.player.hp -= 1;
        if (this.player.hp <= 0) bestNumber("best:tankWave", this.wave, "max");
      }
    });
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.obstacles = this.obstacles.filter((o) => !o.dead);
    this.explosions.forEach((e) => (e.t -= dt));
    this.explosions = this.explosions.filter((e) => e.t > 0);
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    for (let y = 0; y < this.height; y += 64) {
      for (let x = 0; x < this.width; x += 64) ctx.drawImage(this.assets.grass, x, y, 64, 64);
    }
    this.obstacles.forEach((o) => ctx.drawImage(this.assets[o.kind], o.x, o.y, o.w, o.h));
    drawImageCentered(ctx, this.assets.player, this.player.x, this.player.y, this.player.w, this.player.h, this.player.angle);
    this.enemies.forEach((e) => drawImageCentered(ctx, this.assets[e.kind], e.x, e.y, e.w, e.h, e.angle));
    this.bullets.forEach((b) => drawImageCentered(ctx, this.assets[b.owner === "player" ? "bulletBlue" : "bulletRed"], b.x, b.y, 18, 18, Math.atan2(b.vy, b.vx)));
    this.explosions.forEach((e) => drawImageCentered(ctx, this.assets.explosion, e.x, e.y, 52 * (1 - e.t), 52 * (1 - e.t)));
    if (this.player.hp <= 0) this.overlayText("坦克被击毁", [`坚持到第 ${this.wave} 波`, "按 R 或点击“重新开始”"]);
    if (this.paused) this.overlayText("已暂停", ["按 Esc 或点击继续"]);
  }
}
