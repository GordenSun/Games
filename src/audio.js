import { getValue, setValue } from "./storage.js";

let context = null;
let muted = Boolean(getValue("muted", false));

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = Boolean(value);
  setValue("muted", muted);
}

export function ensureAudio() {
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

export async function decodeAudio(arrayBuffer) {
  const ctx = ensureAudio();
  if (!ctx) return null;
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    return null;
  }
}

export function playSound(buffer, volume = 0.45, rate = 1) {
  if (!buffer || muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain).connect(ctx.destination);
  source.start();
}
