import { ICONS } from './icons.js';
import { fetchMeals } from './sheet.js';
import { createStore, localStorageBackend } from './store.js';
import { generateWeek, rerollDay, countHealthy } from './generator.js';
import { buildShoppingList } from './shopping.js';
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride, pickerSheetHTML, weekStripHTML } from './render.js';
import { RULE_DEFAULTS, FIREBASE_CONFIG, FIREBASE_SCOPE, DAYS } from './config.js';
import { mondayOf, addDays, weekDates, formatRange, todayIndex, relativeLabel } from './dates.js';

const state = { meals: [], plan: null, ratings: {}, history: [], error: null, weekOffset: 0 };

let backend = localStorageBackend;
if (FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL) {
  try {
    const { firebaseBackend } = await import('./firebase.js');
    backend = firebaseBackend(FIREBASE_CONFIG, FIREBASE_SCOPE);
    // Live plan sync from the other phone.
    backend.subscribe?.('mp:plan', (_k, plan) => {
      if (plan) { state.plan = plan; renderPlan(); }
    });
  } catch (err) {
    // Offline or CDN unreachable: fall back to local storage so the app still works.
    console.warn('Firebase unavailable, using local storage only:', err);
    backend = localStorageBackend;
  }
}
const store = createStore(backend);

const $ = (sel) => document.querySelector(sel);

const RELAX_TEXT = {
  healthy: 'healthy target', adjacent: 'back-to-back spacing', eatout: 'bought limit',
  repeat: 'no-repeat-from-last-week', insufficient: 'too few meals',
};

const modeOf = (meal) => (meal.where === 'Eat Out' ? 'eatout' : 'cook');

// Reconstruct a read-only plan from a stored week of meal names (history entry).
function lookupMeal(name) {
  return state.meals.find((m) => m.meal === name)
    || { meal: name, category: '', where: '', healthy: false, speed: '', cost: '', special: '', ingredients: [] };
}
function planFromNames(names) {
  const days = names.map((n, i) => {
    const meal = lookupMeal(n);
    return { day: DAYS[i], meal, mode: modeOf(meal), locked: false };
  });
  const plan = { days, relaxations: [], healthyCount: 0 };
  plan.healthyCount = countHealthy(plan);
  return plan;
}
// The plan + dates for the week currently being viewed (offset 0 = current).
function viewedPlan() {
  if (state.weekOffset === 0) return state.plan;
  const names = state.history[state.weekOffset - 1];
  return names ? planFromNames(names) : null;
}
function viewedDates() {
  return weekDates(addDays(mondayOf(new Date()), -7 * state.weekOffset));
}

function paintTabIcons() {
  $('#tab-plan').innerHTML = `${ICONS.calendar}<span>Plan</span>`;
  $('#tab-shopping').innerHTML = `${ICONS.bag}<span>Shopping</span>`;
  $('#tab-meals').innerHTML = `${ICONS.utensils}<span>Meals</span>`;
}

function showScreen(name) {
  for (const s of ['plan', 'shopping', 'meals']) {
    $(`#screen-${s}`).hidden = s !== name;
    $(`#tab-${s}`).setAttribute('aria-selected', String(s === name));
  }
  if (name === 'shopping') renderShopping();
  if (name === 'meals') renderMeals();
}

function renderBanner() {
  const el = $('#plan-banner');
  const r = state.plan?.relaxations || [];
  if (state.error) { el.innerHTML = `<div class="banner warn">${state.error}</div>`; return; }
  if (r.includes('insufficient')) {
    el.innerHTML = `<div class="banner warn">Not enough meals in the Sheet yet to build a full week. Add more and reload.</div>`;
    return;
  }
  el.innerHTML = r.length
    ? `<div class="banner warn">Relaxed ${r.map((x) => RELAX_TEXT[x] || x).join(', ')} — not enough variety in the Sheet to satisfy every rule.</div>`
    : '';
}

function renderPlan() {
  const offset = state.weekOffset;
  const readOnly = offset > 0;
  const plan = viewedPlan();
  const dates = viewedDates();

  // Week-nav header.
  $('#week-rel').textContent = relativeLabel(offset);
  $('#week-range').textContent = formatRange(dates);
  $('#btn-week-back').disabled = offset >= state.history.length;
  $('#btn-week-fwd').disabled = offset === 0;

  // Relaxation banner only on the current (editable) week.
  if (readOnly) $('#plan-banner').innerHTML = ''; else renderBanner();

  const cards = $('#plan-cards');
  if (!plan || plan.days.length === 0) {
    cards.innerHTML = `<p class="empty">Tap "Generate week" to plan your dinners.</p>`;
    $('#week-strip').innerHTML = '';
    $('#btn-generate').hidden = false;
    $('#btn-reroll').hidden = true;
    $('#healthy-meter').textContent = '';
    return;
  }
  cards.innerHTML = plan.days.map((d, i) => dayCardHTML(d, i, { readOnly })).join('');
  const tIdx = offset === 0 ? todayIndex(dates) : -1;
  $('#week-strip').innerHTML = weekStripHTML(plan, { dayNums: dates.map((d) => d.getDate()), todayIndex: tIdx });
  $('#btn-generate').hidden = readOnly;
  $('#btn-reroll').hidden = readOnly;
  $('#healthy-meter').textContent = `Healthy: ${countHealthy(plan)}/${RULE_DEFAULTS.healthyTarget}`;
}

function renderShopping() {
  const el = $('#shopping-list');
  if (!state.plan || state.plan.days.length === 0) {
    el.innerHTML = `<p class="empty">No plan yet — generate a week first.</p>`; return;
  }
  Promise.all([store.getStaples(), store.getChecked()]).then(([staples, checked]) => {
    const checkedSet = new Set(checked);
    const groups = buildShoppingList(state.plan, staples);
    if (groups.length === 0) { el.innerHTML = `<p class="empty">All eat-out this week — nothing to buy.</p>`; return; }
    el.innerHTML = groups.map((g) => `
      <h2 class="aisle-h">${g.aisle}</h2>
      ${g.items.map((it) => shoppingRowHTML(it, it.staple || checkedSet.has(it.key))).join('')}
    `).join('');
  });
}

function renderMeals() {
  const el = $('#meals-list');
  el.innerHTML = state.meals.length
    ? state.meals.map((m) => mealRowHTML(m, state.ratings[m.meal])).join('')
    : `<p class="empty">No meals loaded.</p>`;
}

async function savePlan() {
  await store.setPlan(state.plan);
}

async function onGenerate() {
  state.weekOffset = 0; // generating always returns to the current week
  // Avoid the week currently on screen (treat it as the most-recent history entry)
  // plus the stored older weeks; bias by ratings.
  const current = (state.plan && state.plan.days.length)
    ? state.plan.days.map((d) => d.meal.meal)
    : null;
  const historyForGen = current ? [current, ...state.history] : state.history;
  state.plan = generateWeek(state.meals, historyForGen, { ratings: state.ratings });
  if (current) state.history = await store.pushHistory(current);
  await savePlan();
  renderPlan();
}

function onCardClick(e) {
  if (state.weekOffset !== 0) return; // past weeks are read-only
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = Number(btn.dataset.day);
  const action = btn.dataset.action;
  if (action === 'swap') {
    state.plan = rerollDay(state.plan, i, state.meals, { history: state.history, ratings: state.ratings });
    savePlan(); renderPlan();
  } else if (action === 'pick') {
    openPicker(i);
  }
}

function openPicker(dayIndex) {
  const host = $('#picker-host');
  host.innerHTML = pickerSheetHTML(dayIndex, state.meals);
  host.hidden = false;
}

function closePicker() {
  const host = $('#picker-host');
  host.hidden = true;
  host.innerHTML = '';
}

function applyPick(dayIndex, mealName) {
  const meal = state.meals.find((m) => m.meal === mealName);
  if (!meal) return;
  const warn = evaluateOverride(state.plan, dayIndex, meal);
  state.plan.days[dayIndex] = {
    ...state.plan.days[dayIndex], meal,
    mode: meal.where === 'Eat Out' ? 'eatout' : 'cook',
  };
  state.plan.healthyCount = countHealthy(state.plan);
  closePicker();
  savePlan();
  renderPlan();
  if (warn) {
    const slot = document.querySelector(`[data-warn="${dayIndex}"]`);
    if (slot) slot.textContent = warn;
  }
}

async function onCheck(e) {
  const cb = e.target.closest('[data-action="check"]');
  if (!cb) return;
  const key = cb.dataset.key;
  const checked = new Set(await store.getChecked());
  if (cb.checked) checked.add(key); else checked.delete(key);
  await store.setChecked([...checked]);
  cb.closest('.shop-row').classList.toggle('is-checked', cb.checked);
}

function wireEvents() {
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => showScreen(t.dataset.screen)));
  $('#btn-generate').addEventListener('click', onGenerate);
  $('#btn-reroll').addEventListener('click', () => {
    state.weekOffset = 0;
    const current = state.plan.days.map((d) => d.meal.meal);
    state.plan = generateWeek(state.meals, [current, ...state.history], { ratings: state.ratings });
    savePlan(); renderPlan();
  });
  $('#btn-week-back').addEventListener('click', () => {
    if (state.weekOffset < state.history.length) { state.weekOffset++; renderPlan(); }
  });
  $('#btn-week-fwd').addEventListener('click', () => {
    if (state.weekOffset > 0) { state.weekOffset--; renderPlan(); }
  });
  $('#plan-cards').addEventListener('click', onCardClick);
  $('#picker-host').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'pick-meal') applyPick(Number(btn.dataset.day), btn.dataset.meal);
    else if (btn.dataset.action === 'picker-close') closePicker();
  });
  $('#meals-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="rate"]');
    if (!btn) return;
    const meal = btn.dataset.meal;
    const dir = btn.dataset.rate;
    const next = state.ratings[meal] === dir ? 'neutral' : dir; // tap active to clear
    state.ratings = await store.setRating(meal, next);
    renderMeals();
  });
  $('#shopping-list').addEventListener('change', onCheck);
  $('#week-strip').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-action="goto-day"]');
    if (!chip) return;
    const card = document.querySelector(`.card[data-day="${chip.dataset.day}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('is-flash');
    setTimeout(() => card.classList.remove('is-flash'), 1200);
  });
  $('#btn-reload-meals').addEventListener('click', async () => {
    const note = $('#reload-note');
    note.textContent = 'Reloading…';
    try {
      state.meals = await fetchMeals();
      renderMeals();
      note.textContent = `Loaded ${state.meals.length} meals.`;
    } catch {
      note.textContent = 'Could not reach the Sheet.';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#picker-host').hidden) closePicker();
  });
}

async function init() {
  paintTabIcons();
  wireEvents();
  try {
    state.meals = await fetchMeals();
  } catch (err) {
    state.error = 'Could not reach the Google Sheet. Showing the last saved plan if available.';
  }
  state.plan = await store.getPlan();
  [state.ratings, state.history] = await Promise.all([store.getRatings(), store.getHistory()]);
  renderPlan();
}

init();
