import { ICONS } from './icons.js';
import { fetchMeals, fetchDeals } from './sheet.js';
import { createStore, localStorageBackend } from './store.js';
import { generateWeek, rerollDay, regenerateUnlocked, countHealthy } from './generator.js';
import { dealForDay } from './deals.js';
import { buildShoppingList } from './shopping.js';
import { dayCardHTML, shoppingRowHTML, mealRowHTML } from './render.js';
import { RULE_DEFAULTS } from './config.js';

const store = createStore(localStorageBackend);
const state = { meals: [], deals: [], plan: null, error: null };

const $ = (sel) => document.querySelector(sel);

const RELAX_TEXT = {
  healthy: 'healthy target', category: 'no-repeat-category', eatout: 'eat-out limit',
  repeat: 'no-repeat-from-last-week', insufficient: 'too few meals',
};

function paintTabIcons() {
  $('#tab-plan').innerHTML = `${ICONS.calendar}<span>Plan</span>`;
  $('#tab-shopping').innerHTML = `${ICONS.cart}<span>Shopping</span>`;
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
  renderBanner();
  const cards = $('#plan-cards');
  if (!state.plan || state.plan.days.length === 0) {
    cards.innerHTML = `<p class="empty">Tap "Generate week" to plan your dinners.</p>`;
    $('#btn-reroll').hidden = true;
    $('#healthy-meter').textContent = '';
    return;
  }
  cards.innerHTML = state.plan.days.map((d, i) =>
    dayCardHTML(d, i, d.mode === 'eatout' ? dealForDay(state.deals, d.day) : null)).join('');
  $('#btn-reroll').hidden = false;
  const target = RULE_DEFAULTS.healthyTarget;
  $('#healthy-meter').textContent = `Healthy: ${countHealthy(state.plan)}/${target}`;
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
    ? state.meals.map(mealRowHTML).join('')
    : `<p class="empty">No meals loaded.</p>`;
}

async function savePlan() {
  await store.setPlan(state.plan);
}

async function onGenerate() {
  const lastWeek = await store.getLastWeek();
  // Save the *previous* plan's meals as "last week" so the next gen avoids them.
  if (state.plan && state.plan.days.length) {
    await store.setLastWeek(state.plan.days.map((d) => d.meal.meal));
  }
  state.plan = generateWeek(state.meals, lastWeek);
  await savePlan();
  renderPlan();
}

function onCardClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = Number(btn.dataset.day);
  const action = btn.dataset.action;
  if (action === 'swap') {
    state.plan = rerollDay(state.plan, i, state.meals);
  } else if (action === 'lock') {
    state.plan.days[i].locked = !state.plan.days[i].locked;
  }
  savePlan(); renderPlan();
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
    state.plan = regenerateUnlocked(state.plan, state.meals); savePlan(); renderPlan();
  });
  $('#plan-cards').addEventListener('click', onCardClick);
  $('#shopping-list').addEventListener('change', onCheck);
}

async function init() {
  paintTabIcons();
  wireEvents();
  try {
    [state.meals, state.deals] = await Promise.all([fetchMeals(), fetchDeals()]);
  } catch (err) {
    state.error = 'Could not reach the Google Sheet. Showing the last saved plan if available.';
  }
  state.plan = await store.getPlan();
  renderPlan();
}

init();
