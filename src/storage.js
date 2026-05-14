const PREFIX = "kenney-arcade:";
const memoryFallback = new Map();

function canUseStorage() {
  try {
    const key = `${PREFIX}probe`;
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = canUseStorage();

export function getValue(key, fallback = null) {
  const fullKey = `${PREFIX}${key}`;
  try {
    const raw = storageAvailable ? localStorage.getItem(fullKey) : memoryFallback.get(fullKey);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setValue(key, value) {
  const fullKey = `${PREFIX}${key}`;
  const raw = JSON.stringify(value);
  try {
    if (storageAvailable) localStorage.setItem(fullKey, raw);
    else memoryFallback.set(fullKey, raw);
  } catch {
    memoryFallback.set(fullKey, raw);
  }
}

export function bestNumber(key, value, mode = "max") {
  const current = getValue(key, null);
  if (current == null || (mode === "max" ? value > current : value < current)) {
    setValue(key, value);
    return value;
  }
  return current;
}
