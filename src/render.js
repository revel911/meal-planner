import { ICONS } from './icons.js';
import { RULE_DEFAULTS, DAYS } from './config.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function categoryPill(cat) {
  return `<span class="pill pill-cat">${esc(cat)}</span>`;
}
function healthyPill() {
  return `<span class="pill pill-healthy">${ICONS.leaf}Healthy</span>`;
}
function speedPill(speed) {
  return `<span class="pill pill-speed">${esc(speed)}</span>`;
}
function costPill(cost) {
  return `<span class="pill pill-cost">${esc(cost)}</span>`;
}
function specialPill(special) {
  return `<span class="pill pill-special">${ICONS.tag}${esc(special)}</span>`;
}

// 'N/A' speed means not applicable (e.g. bought meals) -> hide the pill.
const hasSpeed = (s) => Boolean(s) && s !== 'N/A';

// dayIndex maps clicks back to a day. opts.readOnly drops the per-day actions
// (used when viewing a past week).
export function dayCardHTML(day, dayIndex, opts = {}) {
  const m = day.meal;
  const isEat = day.mode === 'eatout';
  const label = `${day.day.toUpperCase()}${isEat ? ' · BOUGHT' : ''}`;
  const pills = [
    categoryPill(m.category),
    m.healthy ? healthyPill() : '',
    hasSpeed(m.speed) ? speedPill(m.speed) : '',
    m.cost ? costPill(m.cost) : '',
    m.special ? specialPill(m.special) : '',
  ].join('');
  const badge = m.where === 'Either'
    ? `<span class="badge badge-either" aria-hidden="true">${ICONS.pot}</span>`
    : isEat
      ? `<span class="badge badge-eatout" aria-hidden="true">${ICONS.utensils}</span>`
      : `<span class="badge badge-cook" aria-hidden="true">${ICONS.home}</span>`;
  const actions = opts.readOnly ? '' : `
        <div class="card-actions">
          <button class="btn-icon" data-action="swap" data-day="${dayIndex}" aria-label="Shuffle ${esc(m.meal)}">${ICONS.refresh}</button>
          <button class="btn-icon" data-action="pick" data-day="${dayIndex}" aria-label="Pick a meal for ${esc(day.day)}">${ICONS.list}</button>
        </div>`;
  const warn = opts.readOnly ? '' : `\n      <p class="override-warn" data-warn="${dayIndex}"></p>`;
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}" data-day="${dayIndex}">
      <div class="card-head">
        ${badge}
        <div class="card-title">
          <span class="day-label">${esc(label)}</span>
          <h3 class="meal-name">${esc(m.meal)}</h3>
        </div>${actions}
      </div>
      <div class="pill-row">${pills}</div>${warn}
    </article>`;
}

// Compact Mon-Sun strip shown above the detail cards: weekday + date number only.
// opts: { dayNums:number[], todayIndex:number }. Each chip jumps to its card.
export function weekStripHTML(plan, opts = {}) {
  if (!plan || !plan.days || plan.days.length === 0) return '';
  const { dayNums = [], todayIndex = -1 } = opts;
  const chips = plan.days.map((d, i) => `
    <button class="ws-chip${i === todayIndex ? ' is-today' : ''}" data-action="goto-day" data-day="${i}">
      <span class="ws-day">${esc(d.day.slice(0, 3))}</span>
      <span class="ws-date">${esc(dayNums[i] != null ? dayNums[i] : '')}</span>
    </button>`).join('');
  return `<div class="week-strip" aria-label="Week overview">${chips}</div>`;
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
    `<button class="btn-thumb${rating === dir ? ' is-on' : ''}" data-action="rate" data-meal="${esc(meal.meal)}" data-rate="${esc(dir)}" aria-pressed="${rating === dir}" aria-label="Thumbs ${dir} ${esc(meal.meal)}">${icon}</button>`;
  return `
    <article class="meal-row">
      <h3 class="meal-name">${esc(meal.meal)}</h3>
      <div class="pill-row">
        <span class="pill pill-cat">${esc(meal.category)}</span>
        <span class="pill pill-where">${esc(meal.where)}</span>
        ${meal.healthy ? healthyPill() : ''}
        ${hasSpeed(meal.speed) ? speedPill(meal.speed) : ''}
        ${meal.cost ? costPill(meal.cost) : ''}
        <span class="thumbs">${thumb('up', ICONS.thumbUp)}${thumb('down', ICONS.thumbDown)}</span>
      </div>
      <p class="meal-ings">${esc(meal.ingredients.join(', '))}</p>
    </article>`;
}

// Inline warning string (empty = no warning) for replacing day `dayIndex` with `meal`.
export function evaluateOverride(plan, dayIndex, meal) {
  const prev = plan.days[dayIndex - 1];
  const next = plan.days[dayIndex + 1];
  const pinned = meal.dealDay === dayIndex;
  if (!pinned && ((prev && prev.meal.category === meal.category)
                  || (next && next.meal.category === meal.category))) {
    return `Heads up: ${meal.category} is on a back-to-back night.`;
  }
  if (meal.where === 'Eat Out') {
    const others = plan.days.filter((_, i) => i !== dayIndex);
    const bought = others.filter((d) => d.mode === 'eatout').length;
    if (bought + 1 > RULE_DEFAULTS.maxEatOut) {
      return `Heads up: that's more than ${RULE_DEFAULTS.maxEatOut} bought nights.`;
    }
  }
  if (meal.dealDay != null && meal.dealDay !== dayIndex) {
    return `Note: ${meal.meal} has a ${DAYS[meal.dealDay]} deal.`;
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
    <div class="picker-sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <h2 class="picker-title" id="picker-title">Pick a meal</h2>
      <div class="picker-list">${rows}</div>
    </div>`;
}
