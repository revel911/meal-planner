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
export function dayCardHTML(day, dayIndex, deal) {
  const isEat = day.mode === 'eatout';
  const label = `${day.day.toUpperCase()}${isEat ? ' · EAT OUT' : ''}`;
  const pills = [
    categoryPill(day.meal.category),
    day.meal.healthy ? healthyPill() : '',
    (isEat && deal) ? dealPill(deal) : '',
  ].join('');
  const badge = isEat
    ? `<span class="badge badge-eatout" aria-hidden="true">${ICONS.utensils}</span>`
    : `<span class="badge badge-cook" aria-hidden="true">${ICONS.home}</span>`;
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}" data-day="${dayIndex}">
      ${badge}
      <p class="day-label">${esc(label)}</p>
      <h3 class="meal-name">${esc(day.meal.meal)}</h3>
      <div class="pill-row">${pills}</div>
      <div class="card-footer">
        <span class="change-label">Change</span>
        <button class="btn-icon" data-action="swap" data-day="${dayIndex}" aria-label="Shuffle ${esc(day.meal.meal)}">${ICONS.refresh}</button>
        <button class="btn-icon" data-action="pick" data-day="${dayIndex}" aria-label="Pick a meal for ${esc(day.day)}">${ICONS.list}</button>
      </div>
      <p class="override-warn" data-warn="${dayIndex}"></p>
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

export function mealRowHTML(meal, rating) {
  const thumb = (dir, icon) =>
    `<button class="btn-thumb${rating === dir ? ' is-on' : ''}" data-action="rate" data-meal="${esc(meal.meal)}" data-rate="${dir}" aria-pressed="${rating === dir}" aria-label="Thumbs ${dir} ${esc(meal.meal)}">${icon}</button>`;
  return `
    <article class="meal-row">
      <h3 class="meal-name">${esc(meal.meal)}</h3>
      <div class="pill-row">
        <span class="pill pill-cat">${esc(meal.category)}</span>
        <span class="pill pill-where">${esc(meal.where)}</span>
        ${meal.healthy ? healthyPill() : ''}
        <span class="thumbs">${thumb('up', ICONS.thumbUp)}${thumb('down', ICONS.thumbDown)}</span>
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

// Bottom-sheet markup listing every meal as a tap-to-pick option for `dayIndex`.
export function pickerSheetHTML(dayIndex, meals) {
  const rows = meals.map((m) =>
    `<button class="picker-row" data-action="pick-meal" data-day="${dayIndex}" data-meal="${esc(m.meal)}">
       <span class="picker-name">${esc(m.meal)}</span>
       <span class="picker-cat">${esc(m.category)}</span>
     </button>`).join('');
  return `
    <div class="picker-backdrop" data-action="picker-close"></div>
    <div class="picker-sheet" role="dialog" aria-label="Pick a meal">
      <h2 class="picker-title">Pick a meal</h2>
      <div class="picker-list">${rows}</div>
    </div>`;
}
