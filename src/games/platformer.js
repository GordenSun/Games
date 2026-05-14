import { CanvasGame } from "../canvasGame.js";
import { bestNumber, getValue } from "../storage.js";
import { clamp, rectsOverlap } from "../math.js";

const TILE = 48;
const LEVEL = [
  "........................................................................",
  "........................................................................",
  "........................................................................",
  "............................C.....................G....................F",
  "...............C...........###..........C.......#####................###",
  "..........#####.................S.....#####.............................",
  "....P..................C.....#####....................E.................",
  "########...........########..................#############......########",
  "########...E.......########.......C....S.....#############......########",
  "########..####.....########.....#####..###...#############......########",
  "########..####.....########..................#############......########",
  "########################################################################",
];

export default class Platformer extends CanvasGame {
  constructor(options) {
    super(options);
    this.worldW = LEVEL[0].length * TILE;
    this.worldH = LEVEL.length * TILE;
    this.reset();
  }

  reset() {
    this.player = { x: 80, y: 220, w: 38, h: 58, vx: 0, vy: 0, onGround: false, face: 1, lives: 3, inv: 0 };
    this.camera = 0;
    this.score = 0;
    this.finished = false;
    this.items = [];
    this.enemies = [];
    this.spikes = [];
    this.flag = { x: this.worldW - 160, y: 0, w: 42, h: 72 };
    for (let y = 0; y < LEVEL.length; y += 1) {
      for (let x = 0; x < LEVEL[y].length; x += 1) {
        const char = LEVEL[y][x];
        if (char === "P") {
          this.player.x = x * TILE;
          this.player.y = y * TILE - 40;
        }
        if (char === "C" || char === "G") this.items.push({ x: x * TILE + 12, y: y * TILE + 12, w: 28, h: 28, kind: char === "C" ? "coin" : "gemBlue" });
        if (char === "S") this.spikes.push({ x: x * TILE + 4, y: y * TILE + 20, w: 40, h: 28 });
        if (char === "E") this.enemies.push({ x: x * TILE, y: y * TILE + 8, w: 42, h: 34, vx: 60, min: x * TILE - 120, max: x * TILE + 120, dead: false });
        if (char === "F") this.flag = { x: x * TILE, y: y * TILE - 36, w: 42, h: 84 };
      }
    }
  }

  update(dt) {
    if (this.input.pressed("KeyR")) this.reset();
    if (this.finished) return;
    const left = this.input.down("ArrowLeft", "KeyA");
    const right = this.input.down("ArrowRight", "KeyD");
    const jump = this.input.pressed("ArrowUp", "KeyW", "Space");
    this.player.vx = (right ? 1 : 0) * 220 - (left ? 1 : 0) * 220;
    if (this.player.vx) this.player.face = Math.sign(this.player.vx);
    if (jump && this.player.onGround) {
      this.player.vy = -510;
      this.player.onGround = false;
    }
    this.player.vy += 1200 * dt;
    this.moveAxis("x", this.player.vx * dt);
    this.moveAxis("y", this.player.vy * dt);
    this.player.inv -= dt;
    this.enemies.forEach((enemy) => {
      if (enemy.dead) return;
      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.vx *= -1;
      if (rectsOverlap(this.player, enemy)) {
        if (this.player.vy > 80 && this.player.y + this.player.h - enemy.y < 22) {
          enemy.dead = true;
          this.player.vy = -320;
          this.score += 80;
        } else this.hurt();
      }
    });
    this.items.forEach((item) => {
      if (!item.dead && rectsOverlap(this.player, item)) {
        item.dead = true;
        this.score += item.kind === "coin" ? 10 : 40;
      }
    });
    this.spikes.forEach((spike) => {
      if (rectsOverlap(this.player, spike)) this.hurt();
    });
    if (this.player.y > this.worldH + 80) this.hurt(true);
    if (rectsOverlap(this.player, this.flag)) this.finish();
    this.camera = clamp(this.player.x - this.width * 0.38, 0, this.worldW - this.width);
    this.setHud(`
      <div><strong>分数</strong> ${this.score}</div>
      <div><strong>生命</strong> ${"❤".repeat(this.player.lives)}</div>
      <div><strong>剩余宝物</strong> ${this.items.filter((i) => !i.dead).length}</div>
      <div><strong>最佳</strong> ${getValue("best:platformer", 0)}</div>
    `);
  }

  moveAxis(axis, amount) {
    this.player[axis] += amount;
    if (axis === "y") this.player.onGround = false;
    for (const tile of this.nearbyTiles()) {
      if (!rectsOverlap(this.player, tile)) continue;
      if (axis === "x") {
        if (amount > 0) this.player.x = tile.x - this.player.w;
        if (amount < 0) this.player.x = tile.x + tile.w;
        this.player.vx = 0;
      } else {
        if (amount > 0) {
          this.player.y = tile.y - this.player.h;
          this.player.onGround = true;
        }
        if (amount < 0) this.player.y = tile.y + tile.h;
        this.player.vy = 0;
      }
    }
  }

  nearbyTiles() {
    const tiles = [];
    const startX = Math.max(0, Math.floor(this.player.x / TILE) - 1);
    const endX = Math.min(LEVEL[0].length - 1, Math.floor((this.player.x + this.player.w) / TILE) + 1);
    const startY = Math.max(0, Math.floor(this.player.y / TILE) - 1);
    const endY = Math.min(LEVEL.length - 1, Math.floor((this.player.y + this.player.h) / TILE) + 1);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        if (LEVEL[y][x] === "#") tiles.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE });
      }
    }
    return tiles;
  }

  hurt(force = false) {
    if (!force && this.player.inv > 0) return;
    this.player.lives -= 1;
    this.player.inv = 1.2;
    this.player.x = Math.max(60, this.player.x - 120);
    this.player.y = 170;
    this.player.vx = 0;
    this.player.vy = 0;
    if (this.player.lives <= 0) {
      bestNumber("best:platformer", this.score, "max");
      this.finished = true;
    }
  }

  finish() {
    this.finished = true;
    this.score += this.player.lives * 100;
    bestNumber("best:platformer", this.score, "max");
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#78c6ff";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.drawImage(this.assets.cloud, 120 - this.camera * 0.18, 70, 110, 56);
    ctx.drawImage(this.assets.cloud, 540 - this.camera * 0.12, 125, 90, 46);
    ctx.save();
    ctx.translate(-this.camera, 0);
    for (let y = 0; y < LEVEL.length; y += 1) {
      for (let x = 0; x < LEVEL[y].length; x += 1) {
        if (LEVEL[y][x] === "#") {
          const above = y > 0 && LEVEL[y - 1][x] === "#";
          ctx.drawImage(above ? this.assets.grassCenter : this.assets.grassMid, x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
    this.spikes.forEach((s) => ctx.drawImage(this.assets.spikes, s.x, s.y, s.w, s.h));
    this.items.filter((i) => !i.dead).forEach((i) => ctx.drawImage(this.assets[i.kind], i.x, i.y, i.w, i.h));
    this.enemies.filter((e) => !e.dead).forEach((e, index) => ctx.drawImage(index % 2 ? this.assets.slimeWalk : this.assets.slime, e.x, e.y, e.w, e.h));
    ctx.drawImage(this.assets.flag, this.flag.x, this.flag.y, this.flag.w, this.flag.h);
    const img = !this.player.onGround ? this.assets.playerJump : Math.abs(this.player.vx) > 1 ? (Math.floor(performance.now() / 160) % 3 === 0 ? this.assets.playerWalk1 : Math.floor(performance.now() / 160) % 3 === 1 ? this.assets.playerWalk2 : this.assets.playerWalk3) : this.assets.playerStand;
    ctx.save();
    ctx.translate(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
    ctx.scale(this.player.face, 1);
    ctx.globalAlpha = this.player.inv > 0 && Math.floor(performance.now() / 100) % 2 ? 0.45 : 1;
    ctx.drawImage(img, -this.player.w / 2 - 8, -this.player.h / 2 - 10, this.player.w + 16, this.player.h + 16);
    ctx.restore();
    ctx.restore();
    if (this.finished) this.overlayText(this.player.lives > 0 ? "抵达终点！" : "冒险失败", [`分数 ${this.score}`, "按 R 或点击“重新开始”"]);
    if (this.paused) this.overlayText("已暂停", ["按 Esc 或点击继续"]);
  }
}
