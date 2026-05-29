import { ICONS } from './icons.js';

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
export function dayCardHTML(day, dayIndex, deal) {
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
        <button class="btn-lock" data-action="lock" data-day="${dayIndex}" aria-label="Lock this day" aria-pressed="${day.locked}">${day.locked ? '🔒' : ''}</button>
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
