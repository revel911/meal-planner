// Single source of app-wide constants. No logic here.
export const SHEET_ID = '1Y-KHVDtsOtPjscoIv3lz1lzCGf9Lb5eOGv9ajVhq9uM';

// Published-CSV endpoint via the gviz API (first/default tab).
export const MEALS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const RULE_DEFAULTS = {
  maxEatOut: 2,
  healthyTarget: 3,
};

// localStorage / Firebase key names (namespaced)
export const KEYS = {
  plan: 'mp:plan',
  lastWeek: 'mp:lastweek',   // legacy: single previous week; read once for migration
  history: 'mp:history',     // string[][] of up to 3 recent weeks, most-recent first
  ratings: 'mp:ratings',     // { [mealName]: 'up' | 'down' }  (neutral = absent)
  staples: 'mp:staples',     // string[] of ingredient keys always kept on hand
  checked: 'mp:checked',     // string[] of currently-checked shopping keys
};

// Ingredients the household always has — start checked, survive a new plan.
export const DEFAULT_STAPLES = ['olive oil', 'garlic', 'onion', 'soy sauce'];

// Firebase web config — dedicated meal-planner project. This client-side config is not a
// secret (it ships in the static site); access is governed by the Realtime Database rules.
// Set FIREBASE_CONFIG to null to fall back to localStorage-only (single device).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCMIdlaBVvtNoYTgjFSofvVKDZ6LntV5p0',
  authDomain: 'meal-planner-104df.firebaseapp.com',
  databaseURL: 'https://meal-planner-104df-default-rtdb.firebaseio.com',
  projectId: 'meal-planner-104df',
  storageBucket: 'meal-planner-104df.firebasestorage.app',
  messagingSenderId: '564368398699',
  appId: '1:564368398699:web:7dff0f242f1d999553942e',
};
export const FIREBASE_SCOPE = 'dinner/home';
