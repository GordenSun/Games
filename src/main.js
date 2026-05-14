import { getGameAssets } from "./assetManifest.js";
import { Input } from "./input.js";
import { loadAssets } from "./loader.js";
import { ensureAudio, isMuted, setMuted } from "./audio.js";
import { getValue } from "./storage.js";

export const GAMES = [
  {
    id: "space",
    title: "星际防线",
    emoji: "🚀",
    accent: "#4ee7ff",
    description: "驾驶飞船穿越陨石雨，击落敌机并拾取能量星。",
    controls: "WASD / 方向键移动，空格射击，Esc 暂停。触摸设备可使用虚拟按钮。",
    goal: "尽量存活并获得更高分，护盾和能量会短暂增强火力。",
    module: "./games/spaceShooter.js",
    stat: () => `最高分 ${getValue("best:space", 0)}`,
  },
  {
    id: "platformer",
    title: "草地冒险",
    emoji: "🌿",
    accent: "#7dff90",
    description: "横版跳跃关卡，收集金币宝石，踩扁史莱姆并抵达旗帜。",
    controls: "A/D 或方向键移动，W/↑/空格跳跃，Esc 暂停。",
    goal: "收集尽可能多的宝物并安全抵达终点旗帜。",
    module: "./games/platformer.js",
    stat: () => `最佳收集 ${getValue("best:platformer", 0)}`,
  },
  {
    id: "tank",
    title: "坦克竞技场",
    emoji: "🛡️",
    accent: "#ffd166",
    description: "在障碍遍布的竞技场中走位、瞄准并击败 AI 坦克。",
    controls: "WASD / 方向键移动，鼠标瞄准，空格或点击射击。",
    goal: "清空每一波敌人，挑战更高波次和分数。",
    module: "./games/tankArena.js",
    stat: () => `最高波次 ${getValue("best:tankWave", 1)}`,
  },
  {
    id: "racer",
    title: "极速赛道",
    emoji: "🏁",
    accent: "#ff5bbd",
    description: "俯视角赛车计时挑战，控制惯性、通过检查点完成三圈。",
    controls: "↑/W 加速，↓/S 刹车，←/→ 或 A/D 转向。",
    goal: "按顺序穿过检查点完成三圈，刷新最佳时间。",
    module: "./games/racer.js",
    stat: () => {
      const best = getValue("best:racer", null);
      return best ? `最佳 ${best}` : "暂无成绩";
    },
  },
  {
    id: "match3",
    title: "宝石连线",
    emoji: "💎",
    accent: "#9a7dff",
    description: "交换相邻宝石，组成三连并触发连锁消除。",
    controls: "鼠标/触摸点击两颗相邻宝石交换，R 重新洗牌。",
    goal: "90 秒内尽可能获得高分，连锁越多分数越高。",
    module: "./games/match3.js",
    stat: () => `最高分 ${getValue("best:match3", 0)}`,
  },
  {
    id: "memory",
    title: "纸牌记忆",
    emoji: "🃏",
    accent: "#ff6961",
    description: "翻开纸牌寻找相同牌面，考验记忆力与步数控制。",
    controls: "鼠标/触摸翻牌，1/2/3 切换难度，R 重开。",
    goal: "用更少步数和更短时间配对所有纸牌。",
    module: "./games/memoryCards.js",
    stat: () => {
      const best = getValue("best:memory", null);
      return best ? `最佳 ${best.moves} 步` : "暂无成绩";
    },
  },
];

const dom = {
  home: document.querySelector("#home"),
  grid: document.querySelector("#game-grid"),
  shell: document.querySelector("#game-shell"),
  canvas: document.querySelector("#game-canvas"),
  title: document.querySelector("#game-title"),
  subtitle: document.querySelector("#game-subtitle"),
  controls: document.querySelector("#control-help"),
  goal: document.querySelector("#goal-help"),
  hud: document.querySelector("#hud"),
  back: document.querySelector("#back-home"),
  pause: document.querySelector("#pause-game"),
  restart: document.querySelector("#restart-game"),
  sound: document.querySelector("#sound-toggle"),
  loading: document.querySelector("#loading-overlay"),
  loadingTitle: document.querySelector("#loading-title"),
  loadingDetail: document.querySelector("#loading-detail"),
  progressBar: document.querySelector("#progress-bar"),
  progressText: document.querySelector("#progress-text"),
  retry: document.querySelector("#retry-load"),
  touch: document.querySelector("#touch-controls"),
};

let currentGame = null;
let currentInput = null;
let currentMeta = null;

renderHome();
bindChrome();
window.addEventListener("hashchange", route);
route();

function renderHome() {
  dom.grid.innerHTML = GAMES.map(
    (game) => `
      <article class="game-card" style="--accent:${game.accent}">
        <div class="game-card__preview" aria-hidden="true">${game.emoji}</div>
        <h2>${game.title}</h2>
        <p>${game.description}</p>
        <div class="meta-row">
          <span class="pill">${game.stat()}</span>
          <span class="pill">按需加载</span>
          <span class="pill">单机游玩</span>
        </div>
        <button type="button" data-play="${game.id}">开始游戏</button>
      </article>
    `,
  ).join("");
  dom.grid.querySelectorAll("[data-play]").forEach((button) => {
    button.addEventListener("click", () => {
      ensureAudio();
      location.hash = `#/game/${button.dataset.play}`;
    });
  });
}

function bindChrome() {
  updateSoundButton();
  dom.sound.addEventListener("click", () => {
    ensureAudio();
    setMuted(!isMuted());
    updateSoundButton();
  });
  dom.back.addEventListener("click", () => {
    location.hash = "#/";
  });
  dom.pause.addEventListener("click", () => {
    currentGame?.togglePause();
    dom.pause.textContent = currentGame?.paused ? "继续" : "暂停";
    dom.canvas.focus({ preventScroll: true });
  });
  dom.restart.addEventListener("click", () => startGame(currentMeta?.id));
  dom.retry.addEventListener("click", () => startGame(currentMeta?.id));
  document.addEventListener("pointerdown", () => ensureAudio(), { once: false });
  document.addEventListener("keydown", () => ensureAudio(), { once: false });
}

function updateSoundButton() {
  dom.sound.textContent = `声音：${isMuted() ? "关" : "开"}`;
  dom.sound.setAttribute("aria-pressed", String(isMuted()));
}

async function route() {
  const match = location.hash.match(/^#\/game\/([a-z0-9-]+)/);
  if (!match) {
    stopCurrent();
    dom.home.classList.remove("is-hidden");
    dom.shell.classList.add("is-hidden");
    renderHome();
    return;
  }
  await startGame(match[1]);
}

async function startGame(id) {
  const meta = GAMES.find((game) => game.id === id);
  if (!meta) {
    location.hash = "#/";
    return;
  }
  stopCurrent();
  currentMeta = meta;
  dom.home.classList.add("is-hidden");
  dom.shell.classList.remove("is-hidden");
  dom.title.textContent = meta.title;
  dom.subtitle.textContent = meta.description;
  dom.controls.textContent = meta.controls;
  dom.goal.textContent = meta.goal;
  dom.hud.innerHTML = "准备中...";
  dom.pause.textContent = "暂停";
  showLoading(meta, 0, "准备下载资源");

  try {
    const [module, assets] = await Promise.all([
      import(meta.module),
      loadAssets(getGameAssets(meta.id), (progress) => {
        showLoading(meta, progress.ratio, progress.label);
      }),
    ]);
    hideLoading();
    currentInput = new Input(dom.canvas, dom.touch);
    currentGame = new module.default({ canvas: dom.canvas, input: currentInput, assets, hud: dom.hud, meta });
    currentGame.start();
    dom.canvas.focus({ preventScroll: true });
  } catch (error) {
    console.error(error);
    showError(meta, error);
  }
}

function stopCurrent() {
  currentGame?.destroy();
  currentGame = null;
  currentInput?.destroy();
  currentInput = null;
}

function showLoading(meta, ratio, detail) {
  dom.loading.classList.remove("is-hidden");
  dom.retry.classList.add("is-hidden");
  dom.loadingTitle.textContent = meta ? `加载 ${meta.title}` : "加载中";
  dom.loadingDetail.textContent = detail || "";
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  dom.progressBar.style.width = `${pct}%`;
  dom.progressText.textContent = `${pct}%`;
}

function hideLoading() {
  dom.loading.classList.add("is-hidden");
}

function showError(meta, error) {
  dom.loading.classList.remove("is-hidden");
  dom.retry.classList.remove("is-hidden");
  dom.loadingTitle.textContent = `${meta.title} 加载失败`;
  dom.loadingDetail.textContent = error.message;
  dom.progressBar.style.width = "0%";
  dom.progressText.textContent = "请重试";
}
