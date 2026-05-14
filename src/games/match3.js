import { CanvasGame } from "../canvasGame.js";
import { bestNumber, getValue } from "../storage.js";
import { formatTime } from "../math.js";

const COLORS = ["blue", "green", "red", "yellow", "orange", "pink"];
const SIZE = 8;

export default class Match3 extends CanvasGame {
  constructor(options) {
    super(options);
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: SIZE }, (_, y) =>
      Array.from({ length: SIZE }, (_, x) => this.randomGem(x, y)),
    );
    this.selected = null;
    this.score = 0;
    this.combo = 0;
    this.timeLeft = 90;
    this.message = "点击相邻宝石交换";
    this.gameOver = false;
  }

  randomGem(x, y) {
    const choices = COLORS.filter((color) => {
      const left = x >= 2 && this?.board?.[y]?.[x - 1] === color && this.board[y][x - 2] === color;
      const up = y >= 2 && this?.board?.[y - 1]?.[x] === color && this.board[y - 2][x] === color;
      return !left && !up;
    });
    return choices[Math.floor(Math.random() * choices.length)];
  }

  update(dt) {
    if (this.input.pressed("KeyR")) this.reset();
    if (!this.gameOver) this.timeLeft -= dt;
    if (this.timeLeft <= 0 && !this.gameOver) {
      this.gameOver = true;
      bestNumber("best:match3", this.score, "max");
    }
    if (!this.gameOver && this.input.pointer.clicked) this.handleClick();
    this.setHud(`
      <div><strong>分数</strong> ${this.score}</div>
      <div><strong>连锁</strong> x${Math.max(1, this.combo)}</div>
      <div><strong>剩余</strong> ${formatTime(this.timeLeft)}</div>
      <div><strong>最高</strong> ${getValue("best:match3", 0)}</div>
      <div>${this.message}</div>
    `);
  }

  handleClick() {
    const pos = this.pointerToCell();
    if (!pos) return;
    if (!this.selected) {
      this.selected = pos;
      this.message = "再点一个相邻宝石";
      return;
    }
    const dist = Math.abs(pos.x - this.selected.x) + Math.abs(pos.y - this.selected.y);
    if (dist !== 1) {
      this.selected = pos;
      this.message = "只能交换相邻宝石";
      return;
    }
    this.swap(pos, this.selected);
    const matches = this.findMatches();
    if (matches.size === 0) {
      this.swap(pos, this.selected);
      this.message = "没有形成三连，交换已回弹";
      this.combo = 0;
    } else {
      this.combo = 0;
      this.resolveMatches(matches);
    }
    this.selected = null;
  }

  pointerToCell() {
    const layout = this.layout();
    const x = Math.floor((this.input.pointer.x - layout.x) / layout.cell);
    const y = Math.floor((this.input.pointer.y - layout.y) / layout.cell);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return { x, y };
  }

  layout() {
    const cell = Math.min(64, Math.floor((Math.min(this.width, this.height) - 80) / SIZE));
    return { cell, x: (this.width - cell * SIZE) / 2, y: (this.height - cell * SIZE) / 2 + 8 };
  }

  swap(a, b) {
    [this.board[a.y][a.x], this.board[b.y][b.x]] = [this.board[b.y][b.x], this.board[a.y][a.x]];
  }

  findMatches() {
    const found = new Set();
    for (let y = 0; y < SIZE; y += 1) {
      let run = 1;
      for (let x = 1; x <= SIZE; x += 1) {
        if (x < SIZE && this.board[y][x] === this.board[y][x - 1]) run += 1;
        else {
          if (run >= 3) for (let i = x - run; i < x; i += 1) found.add(`${i},${y}`);
          run = 1;
        }
      }
    }
    for (let x = 0; x < SIZE; x += 1) {
      let run = 1;
      for (let y = 1; y <= SIZE; y += 1) {
        if (y < SIZE && this.board[y][x] === this.board[y - 1][x]) run += 1;
        else {
          if (run >= 3) for (let i = y - run; i < y; i += 1) found.add(`${x},${i}`);
          run = 1;
        }
      }
    }
    return found;
  }

  resolveMatches(matches) {
    while (matches.size) {
      this.combo += 1;
      this.score += matches.size * 10 * this.combo;
      matches.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        this.board[y][x] = null;
      });
      for (let x = 0; x < SIZE; x += 1) {
        const column = [];
        for (let y = SIZE - 1; y >= 0; y -= 1) if (this.board[y][x]) column.push(this.board[y][x]);
        while (column.length < SIZE) column.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
        for (let y = SIZE - 1; y >= 0; y -= 1) this.board[y][x] = column[SIZE - 1 - y];
      }
      matches = this.findMatches();
    }
    this.message = `消除成功，连锁 x${this.combo}`;
  }

  render(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#101a2f";
    ctx.fillRect(0, 0, this.width, this.height);
    const layout = this.layout();
    ctx.drawImage(this.assets.back, layout.x - 28, layout.y - 28, layout.cell * SIZE + 56, layout.cell * SIZE + 56);
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const gem = this.board[y][x];
        const px = layout.x + x * layout.cell;
        const py = layout.y + y * layout.cell;
        ctx.fillStyle = "rgba(255,255,255,.05)";
        ctx.fillRect(px + 4, py + 4, layout.cell - 8, layout.cell - 8);
        ctx.drawImage(this.assets[gem], px + 7, py + 7, layout.cell - 14, layout.cell - 14);
      }
    }
    if (this.selected) {
      ctx.strokeStyle = "#4ee7ff";
      ctx.lineWidth = 4;
      ctx.strokeRect(layout.x + this.selected.x * layout.cell + 3, layout.y + this.selected.y * layout.cell + 3, layout.cell - 6, layout.cell - 6);
    }
    if (this.gameOver) this.overlayText("时间到！", [`最终分数 ${this.score}`, "按 R 或点击“重新开始”再玩"]);
    if (this.paused) this.overlayText("已暂停", ["按 Esc 或点击继续"]);
  }
}
