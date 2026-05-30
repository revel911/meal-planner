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

  async function getHistory() {
    const hist = await readJSON(KEYS.history, null);
    if (hist !== null) return hist;
    // One-time fallback: seed from the legacy single-week key if present.
    const legacy = await readJSON(KEYS.lastWeek, null);
    return legacy && legacy.length ? [legacy] : [];
  }

  return {
    getPlan: () => readJSON(KEYS.plan, null),
    setPlan: (plan) => writeJSON(KEYS.plan, plan),
    getStaples: () => readJSON(KEYS.staples, DEFAULT_STAPLES.slice()),
    setStaples: (arr) => writeJSON(KEYS.staples, arr),
    getChecked: () => readJSON(KEYS.checked, []),
    setChecked: (arr) => writeJSON(KEYS.checked, arr),

    getHistory,
    async pushHistory(week) {
      const hist = await getHistory();
      const next = [week, ...hist].slice(0, 3);
      await writeJSON(KEYS.history, next);
      return next;
    },

    getRatings: () => readJSON(KEYS.ratings, {}),
    async setRating(mealName, value) {
      const ratings = await readJSON(KEYS.ratings, {});
      if (value === 'up' || value === 'down') ratings[mealName] = value;
      else delete ratings[mealName];
      await writeJSON(KEYS.ratings, ratings);
      return ratings;
    },
  };
}
