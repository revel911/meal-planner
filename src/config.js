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
