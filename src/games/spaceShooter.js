import { CanvasGame } from "../canvasGame.js";
import { bestNumber, getValue } from "../storage.js";
import { clamp, drawImageCentered, pick, rand, rectsOverlap } from "../math.js";
import { playSound } from "../audio.js";

export default class SpaceShooter extends CanvasGame {
  constructor(options) {
    super(options);
    this.reset();
  }

  reset() {
    this.player = { x: this.width / 2, y: this.height - 80, w: 58, h: 46, lives: 3, cooldown: 0, shield: 0, rapid: 0 };
    this.bullets = [];
    this.enemies = [];
    this.powers = [];
    this.stars = Array.from({ length: 80 }, () => ({ x: rand(0, this.width), y: rand(0, this.height), s: rand(1, 3), v: rand(30, 120) }));
    this.score = 0;
    this.time = 0;
    this.spawn = 0;
    this.over = false;
  }

  update(dt) {
    if (this.input.pressed("KeyR")) this.reset();
    if (this.over) return;
    this.time += dt;
    const speed = this.input.down("Shift") ? 410 : 320;
    const dx = (this.input.down("ArrowRight", "KeyD") ? 1 : 0) - (this.input.down("ArrowLeft", "KeyA") ? 1 : 0);
    const dy = (this.input.down("ArrowDown", "KeyS") ? 1 : 0) - (this.input.down("ArrowUp", "KeyW") ? 1 : 0);
    this.player.x = clamp(this.player.x + dx * speed * dt, 35, this.width - 35);
    this.player.y = clamp(this.player.y + dy * speed * dt, 55, this.height - 45);
    this.player.cooldown -= dt;
    this.player.shield -= dt;
    this.player.rapid -= dt;
    if ((this.input.down("Space") || this.input.pointer.down) && this.player.cooldown <= 0) this.shoot();

    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawnEnemy();
      this.spawn = Math.max(0.28, 0.9 - this.time * 0.012);
    }
    this.updateObjects(dt);
    this.collisions();
    this.setHud(`
      <div><strong>分数</strong> ${this.score}</div>
      <div><strong>生命</strong> ${"❤".repeat(this.player.lives)}</div>
      <div><strong>护盾</strong> ${this.player.shield > 0 ? "开启" : "无"}</div>
      <div><strong>最高</strong> ${getValue("best:space", 0)}</div>
    `);
  }

  shoot() {
    this.player.cooldown = this.player.rapid > 0 ? 0.12 : 0.22;
    const offsets = this.player.rapid > 0 ? [-16, 16] : [0];
    offsets.forEach((offset) => this.bullets.push({ x: this.player.x + offset, y: this.player.y - 34, w: 9, h: 28, vy: -620 }));
    playSound(this.assets.laserSfx, 0.22, rand(0.9, 1.12));
  }

  spawnEnemy() {
    const meteor = Math.random() < 0.45;
    const size = meteor ? rand(48, 76) : rand(48, 62);
    this.enemies.push({
      x: rand(size, this.width - size),
      y: -size,
      w: size,
      h: size,
      vy: rand(90, 170) + this.time * 4,
      hp: meteor ? 2 : 1,
      kind: meteor ? pick(["meteorBrown", "meteorGrey"]) : pick(["enemyBlack", "enemyRed"]),
      meteor,
    });
  }

  updateObjects(dt) {
    this.stars.forEach((star) => {
      star.y += star.v * dt;
      if (star.y > this.height) {
        star.y = 0;
        star.x = rand(0, this.width);
      }
    });
    this.bullets.forEach((b) => (b.y += b.vy * dt));
    this.enemies.forEach((e) => (e.y += e.vy * dt));
    this.powers.forEach((p) => (p.y += p.vy * dt));
    this.bullets = this.bullets.filter((b) => b.y > -40);
    this.enemies = this.enemies.filter((e) => {
      if (e.y > this.height + 80) {
        this.hurt();
        return false;
      }
      return true;
    });
    this.powers = this.powers.filter((p) => p.y < this.height + 40);
  }

  collisions() {
    for (const bullet of [...this.bullets]) {
      for (const enemy of [...this.enemies]) {
        if (rectsOverlap(bullet, enemy)) {
          bullet.dead = true;
          enemy.hp -= 1;
          if (enemy.hp <= 0) {
            enemy.dead = true;
            this.score += enemy.meteor ? 15 : 30;
            if (Math.random() < 0.16) this.powers.push({ x: enemy.x, y: enemy.y, w: 36, h: 36, vy: 95, type: pick(["bolt", "shield", "star"]) });
            playSound(this.assets.scoreSfx, 0.18);
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    const playerRect = { x: this.player.x - 24, y: this.player.y - 22, w: 48, h: 44 };
    for (const enemy of [...this.enemies]) {
      if (rectsOverlap(playerRect, enemy)) {
        enemy.dead = true;
        this.hurt();
      }
    }
    for (const power of [...this.powers]) {
      if (rectsOverlap(playerRect, power)) {
        power.dead = true;
        if (power.type === "shield") this.player.shield = 5;
        if (power.type === "bolt") this.player.rapid = 6;
        if (power.type === "star") this.score += 100;
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.powers = this.powers.filter((p) => !p.dead);
  }

  hurt() {
    if (this.player.shield > 0) {
      this.player.shield = 0;
      return;
    }
    this.player.lives -= 1;
    if (this.player.lives <= 0) {
      this.over = true;
      bestNumber("best:space", this.score, "max");
      playSound(this.assets.loseSfx, 0.35);
    }
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.assets.bg, 0, 0, this.width, this.height);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    this.stars.forEach((star) => ctx.fillRect(star.x, star.y, star.s, star.s));
    this.powers.forEach((p) => drawImageCentered(ctx, this.assets[p.type], p.x, p.y, p.w, p.h));
    this.bullets.forEach((b) => drawImageCentered(ctx, this.assets.laser, b.x, b.y, b.w, b.h));
    this.enemies.forEach((e) => drawImageCentered(ctx, this.assets[e.kind], e.x, e.y, e.w, e.h, e.meteor ? this.time * 1.2 : Math.PI));
    drawImageCentered(ctx, this.assets.player, this.player.x, this.player.y, this.player.w, this.player.h);
    if (this.player.shield > 0) {
      ctx.strokeStyle = "#4ee7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 42, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.over) this.overlayText("飞船被击毁", [`最终分数 ${this.score}`, "按 R 或点击“重新开始”再战"]);
    if (this.paused) this.overlayText("已暂停", ["按 Esc 或点击继续"]);
  }
}
