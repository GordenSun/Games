import { CanvasGame } from "../canvasGame.js";
import { bestNumber, getValue, setValue } from "../storage.js";
import { formatTime, pointInRect, shuffle } from "../math.js";

const FACE_KEYS = ["heartsA", "heartsK", "diamondsQ", "diamonds10", "spadesK", "spades7", "clubs2", "clubsJ", "jokerRed", "jokerBlack"];

export default class MemoryCards extends CanvasGame {
  constructor(options) {
    super(options);
    this.difficulties = [
      { name: "简单", cols: 4, rows: 4 },
      { name: "普通", cols: 5, rows: 4 },
      { name: "困难", cols: 5, rows: 4 },
    ];
    this.difficulty = 0;
    this.reset();
  }

  reset() {
    const diff = this.difficulties[this.difficulty];
    const pairCount = (diff.cols * diff.rows) / 2;
    const faces = FACE_KEYS.slice(0, pairCount);
    this.cards = shuffle([...faces, ...faces]).map((face, index) => ({
      id: index,
      face,
      flipped: false,
      matched: false,
      rect: { x: 0, y: 0, w: 0, h: 0 },
    }));
    this.flipped = [];
    this.lock = 0;
    this.moves = 0;
    this.time = 0;
    this.won = false;
  }

  update(dt) {
    if (this.input.pressed("Digit1")) {
      this.difficulty = 0;
      this.reset();
    }
    if (this.input.pressed("Digit2")) {
      this.difficulty = 1;
      this.reset();
    }
    if (this.input.pressed("Digit3")) {
      this.difficulty = 2;
      this.reset();
    }
    if (this.input.pressed("KeyR")) this.reset();
    if (!this.won) this.time += dt;
    if (this.lock > 0) {
      this.lock -= dt;
      if (this.lock <= 0) {
        this.flipped.forEach((card) => (card.flipped = false));
        this.flipped = [];
      }
    }
    if (this.input.pointer.clicked && this.lock <= 0 && !this.won) {
      const card = this.cards.find((item) => !item.matched && !item.flipped && pointInRect(this.input.pointer, item.rect));
      if (card) this.flip(card);
    }
    this.setHud(`
      <div><strong>难度</strong> ${this.difficulties[this.difficulty].name}（按 1/2/3 切换）</div>
      <div><strong>步数</strong> ${this.moves}</div>
      <div><strong>时间</strong> ${formatTime(this.time)}</div>
      <div><strong>最佳</strong> ${getValue("best:memory", null)?.moves ?? "暂无"} 步</div>
    `);
  }

  flip(card) {
    card.flipped = true;
    this.flipped.push(card);
    if (this.flipped.length === 2) {
      this.moves += 1;
      const [a, b] = this.flipped;
      if (a.face === b.face) {
        a.matched = true;
        b.matched = true;
        this.flipped = [];
        if (this.cards.every((item) => item.matched)) this.finish();
      } else {
        this.lock = 0.75;
      }
    }
  }

  finish() {
    this.won = true;
    const currentBest = getValue("best:memory", null);
    if (!currentBest || this.moves < currentBest.moves || (this.moves === currentBest.moves && this.time < currentBest.time)) {
      setValue("best:memory", { moves: this.moves, time: this.time });
    }
    bestNumber("best:memoryMoves", this.moves, "min");
  }

  render(ctx) {
    const diff = this.difficulties[this.difficulty];
    ctx.clearRect(0, 0, this.width, this.height);
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#0b1b31");
    gradient.addColorStop(1, "#260f2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const gap = 14;
    const cardW = Math.min(120, (this.width - 120 - (diff.cols - 1) * gap) / diff.cols);
    const cardH = cardW * 1.4;
    const startX = (this.width - diff.cols * cardW - (diff.cols - 1) * gap) / 2;
    const startY = (this.height - diff.rows * cardH - (diff.rows - 1) * gap) / 2 + 10;

    this.cards.forEach((card, index) => {
      const col = index % diff.cols;
      const row = Math.floor(index / diff.cols);
      card.rect = { x: startX + col * (cardW + gap), y: startY + row * (cardH + gap), w: cardW, h: cardH };
      ctx.save();
      ctx.shadowColor = card.matched ? "rgba(125,255,144,.45)" : "rgba(0,0,0,.35)";
      ctx.shadowBlur = 12;
      const img = card.flipped || card.matched ? this.assets[card.face] : this.assets.back;
      ctx.drawImage(img, card.rect.x, card.rect.y, card.rect.w, card.rect.h);
      if (card.matched) {
        ctx.strokeStyle = "#7dff90";
        ctx.lineWidth = 4;
        ctx.strokeRect(card.rect.x + 2, card.rect.y + 2, card.rect.w - 4, card.rect.h - 4);
      }
      ctx.restore();
    });

    if (this.won) {
      this.overlayText("全部配对完成！", [`步数 ${this.moves} · 时间 ${formatTime(this.time)}`, "按 R 或点击“重新开始”再来一局"]);
    }
    if (this.paused) this.overlayText("已暂停", ["按 Esc 或点击继续"]);
  }
}
