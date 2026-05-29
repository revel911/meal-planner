// Firebase RTDB backend conforming to the store's { get, set } interface, plus subscribe().
// Uses the modular CDN SDK via dynamic import so there's still no build step.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, get as dbGet, set as dbSet, onValue }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

export function firebaseBackend(config, scope = 'dinner/home') {
  const app = initializeApp(config);
  const db = getDatabase(app);
  const path = (key) => `${scope}/${key.replace(/:/g, '_')}`;
  return {
    async get(key) {
      const snap = await dbGet(ref(db, path(key)));
      return snap.exists() ? snap.val() : null;
    },
    async set(key, value) {
      await dbSet(ref(db, path(key)), value);
    },
    // Extra: live updates. cb(key, parsedValue) on every remote change.
    subscribe(key, cb) {
      return onValue(ref(db, path(key)), (snap) => {
        const raw = snap.exists() ? snap.val() : null;
        try { cb(key, raw == null ? null : JSON.parse(raw)); } catch { cb(key, null); }
      });
    },
  };
}
