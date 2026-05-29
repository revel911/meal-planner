import { KEYS, DEFAULT_STAPLES } from './config.js';

// Backend interface: { get(key): Promise<string|null>, set(key, value): Promise<void> }

export const localStorageBackend = {
  async get(k) { return globalThis.localStorage ? globalThis.localStorage.getItem(k) : null; },
  async set(k, v) { if (globalThis.localStorage) globalThis.localStorage.setItem(k, v); },
};

export function memoryBackend(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async set(k, v) { m.set(k, String(v)); },
  };
}

export function createStore(backend) {
  async function readJSON(key, fallback) {
    const raw = await backend.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  const writeJSON = (key, val) => backend.set(key, JSON.stringify(val));

  return {
    getPlan: () => readJSON(KEYS.plan, null),
    setPlan: (plan) => writeJSON(KEYS.plan, plan),
    getStaples: () => readJSON(KEYS.staples, DEFAULT_STAPLES.slice()),
    setStaples: (arr) => writeJSON(KEYS.staples, arr),
    getLastWeek: () => readJSON(KEYS.lastWeek, []),
    setLastWeek: (arr) => writeJSON(KEYS.lastWeek, arr),
    getChecked: () => readJSON(KEYS.checked, []),
    setChecked: (arr) => writeJSON(KEYS.checked, arr),
  };
}
