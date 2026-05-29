import { ICONS } from './icons.js';
import { RULE_DEFAULTS } from './config.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function categoryPill(cat) {
  return `<span class="pill pill-cat">${esc(cat)}</span>`;
}
function healthyPill() {
  return `<span class="pill pill-healthy">${ICONS.leaf}Healthy</span>`;
}
function dealPill(deal) {
  return `<span class="pill pill-deal">${ICONS.tag}${esc(deal.deal || deal.restaurant)}</span>`;
}

// dayIndex is needed so event handlers in app.js can map clicks back to a day.
export function dayCardHTML(day, dayIndex, deal, meals = []) {
  const isEat = day.mode === 'eatout';
  const label = `${day.day.toUpperCase()}${isEat ? ' · EAT OUT' : ''}`;
  const pills = [
    categoryPill(day.meal.category),
    day.meal.healthy ? healthyPill() : '',
    (isEat && deal) ? dealPill(deal) : '',
  ].join('');
  const lockCls = day.locked ? ' is-locked' : '';
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}${lockCls}" data-day="${dayIndex}">
      <p class="day-label">${esc(label)}</p>
      <h3 class="meal-name">${esc(day.meal.meal)}</h3>
      <div class="pill-row">
        ${pills}
        <button class="btn-swap" data-action="swap" data-day="${dayIndex}" aria-label="Swap ${esc(day.meal.meal)}">${ICONS.refresh}</button>
        <button class="btn-lock${day.locked ? ' is-on' : ''}" data-action="lock" data-day="${dayIndex}" aria-label="Lock this day" aria-pressed="${day.locked}">${ICONS.lock}</button>
      </div>
      <div class="override">
        ${daySelectHTML(day, dayIndex, meals)}
        <p class="override-warn" data-warn="${dayIndex}"></p>
      </div>
    </article>`;
}

export function shoppingRowHTML(item, checked) {
  return `
    <label class="shop-row${checked ? ' is-checked' : ''}" data-key="${esc(item.key)}">
      <input type="checkbox" data-action="check" data-key="${esc(item.key)}" ${checked ? 'checked' : ''}/>
      <span class="shop-name">${esc(item.name)}</span>
      ${item.staple ? '<span class="pill pill-staple">staple</span>' : ''}
      <span class="shop-meals">${esc(item.meals.join(', '))}</span>
    </label>`;
}

export function mealRowHTML(meal) {
  return `
    <article class="meal-row">
      <h3 class="meal-name">${esc(meal.meal)}</h3>
      <div class="pill-row">
        <span class="pill pill-cat">${esc(meal.category)}</span>
        <span class="pill pill-where">${esc(meal.where)}</span>
        ${meal.healthy ? healthyPill() : ''}
      </div>
      <p class="meal-ings">${esc(meal.ingredients.join(', '))}</p>
    </article>`;
}

// Inline warning string (empty = no warning) for replacing day `dayIndex` with `meal`.
export function evaluateOverride(plan, dayIndex, meal) {
  const others = plan.days.filter((_, i) => i !== dayIndex);
  if (others.some((d) => d.meal.category === meal.category)) {
    return `Heads up: ${meal.category} is already used this week (duplicate category).`;
  }
  if (meal.where === 'Eat Out') {
    const eatOut = others.filter((d) => d.mode === 'eatout').length;
    if (eatOut + 1 > RULE_DEFAULTS.maxEatOut) {
      return `Heads up: that's more than ${RULE_DEFAULTS.maxEatOut} eat-out nights.`;
    }
  }
  return '';
}

export function daySelectHTML(day, dayIndex, meals) {
  const opts = meals.map((m) =>
    `<option value="${esc(m.meal)}"${m.meal === day.meal.meal ? ' selected' : ''}>${esc(m.meal)} (${esc(m.category)})</option>`).join('');
  return `<select class="day-select" data-action="override" data-day="${dayIndex}" aria-label="Choose meal for ${esc(day.day)}">${opts}</select>`;
}
