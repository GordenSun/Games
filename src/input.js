export class Input {
  constructor(canvas, touchRoot) {
    this.canvas = canvas;
    this.touchRoot = touchRoot;
    this.keys = new Set();
    this.justPressed = new Set();
    this.pointer = { x: 0, y: 0, down: false, clicked: false };
    this._virtualDown = new Map();
    this._listeners = [];
    this.bind();
  }

  bind() {
    const onKeyDown = (event) => {
      const key = normalizeKey(event.key);
      if (handledKeys.has(key)) event.preventDefault();
      if (!this.keys.has(key)) this.justPressed.add(key);
      this.keys.add(key);
    };
    const onKeyUp = (event) => {
      const key = normalizeKey(event.key);
      this.keys.delete(key);
    };
    const onPointerMove = (event) => this.updatePointer(event);
    const onPointerDown = (event) => {
      this.updatePointer(event);
      this.pointer.down = true;
      this.pointer.clicked = true;
      this.canvas.focus({ preventScroll: true });
    };
    const onPointerUp = (event) => {
      this.updatePointer(event);
      this.pointer.down = false;
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    this.canvas.addEventListener("pointermove", onPointerMove);
    this.canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    this._listeners.push([window, "keydown", onKeyDown], [window, "keyup", onKeyUp], [this.canvas, "pointermove", onPointerMove], [this.canvas, "pointerdown", onPointerDown], [window, "pointerup", onPointerUp]);

    if (this.touchRoot) {
      this.touchRoot.querySelectorAll("[data-virtual-key]").forEach((button) => {
        const key = normalizeKey(button.dataset.virtualKey);
        const press = (event) => {
          event.preventDefault();
          this._virtualDown.set(key, (this._virtualDown.get(key) || 0) + 1);
          this.justPressed.add(key);
          this.keys.add(key);
        };
        const release = (event) => {
          event.preventDefault();
          const next = Math.max(0, (this._virtualDown.get(key) || 1) - 1);
          this._virtualDown.set(key, next);
          if (next === 0) this.keys.delete(key);
        };
        button.addEventListener("pointerdown", press);
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("pointerleave", release);
        this._listeners.push([button, "pointerdown", press], [button, "pointerup", release], [button, "pointercancel", release], [button, "pointerleave", release]);
      });
    }
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
    this.pointer.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
  }

  down(...keys) {
    return keys.some((key) => this.keys.has(normalizeKey(key)));
  }

  pressed(...keys) {
    return keys.some((key) => this.justPressed.has(normalizeKey(key)));
  }

  endFrame() {
    this.justPressed.clear();
    this.pointer.clicked = false;
  }

  destroy() {
    for (const [target, type, fn] of this._listeners) target.removeEventListener(type, fn);
    this._listeners.length = 0;
    this.keys.clear();
  }
}

const handledKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "Enter", "Escape"]);

function normalizeKey(key) {
  if (key === " ") return "Space";
  if (key.length === 1) return `Key${key.toUpperCase()}`;
  return key;
}
