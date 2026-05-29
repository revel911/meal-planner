// Single source of app-wide constants. No logic here.
export const SHEET_ID = '1Y2ZhSSoxVelTCsDi_Moo5et0HRlqLvShK242a6sd3i4';

// Published-CSV endpoints via the gviz API. The meals tab is the first/default tab.
// The deals tab is referenced by name; if it does not resolve, gviz falls back to the
// first tab, so fetchDeals() guards against that (see sheet.js).
export const MEALS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
export const DEALS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Deals`;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const RULE_DEFAULTS = {
  maxEatOut: 2,
  healthyTarget: 3,
};

// localStorage / Firebase key names (namespaced)
export const KEYS = {
  plan: 'mp:plan',
  lastWeek: 'mp:lastweek',   // string[] of meal names from the previously saved plan
  staples: 'mp:staples',     // string[] of ingredient keys always kept on hand
  checked: 'mp:checked',     // string[] of currently-checked shopping keys
};

// Ingredients the household always has — start checked, survive a new plan.
export const DEFAULT_STAPLES = ['olive oil', 'garlic', 'onion', 'soy sauce'];

// Firebase web config (reuses the health-tracker project; meal planner data lives under
// the FIREBASE_SCOPE path so it is isolated from the health tracker's subtree).
// This is client-side config (already public in the health-tracker app), not a secret.
// Set FIREBASE_CONFIG to null to fall back to localStorage-only (single device).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAmKd75of6GIitkVT_AyCSjpxf9tuKz_Uw',
  authDomain: 'health-tracker-bdb11.firebaseapp.com',
  databaseURL: 'https://health-tracker-bdb11-default-rtdb.firebaseio.com',
  projectId: 'health-tracker-bdb11',
  storageBucket: 'health-tracker-bdb11.firebasestorage.app',
  messagingSenderId: '765649450772',
  appId: '1:765649450772:web:50f4341dc2b26b629ef401',
};
export const FIREBASE_SCOPE = 'dinner/home';
