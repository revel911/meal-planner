import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/icons.js';
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride, pickerSheetHTML, weekStripHTML } from '../src/render.js';

const COOK_DAY = { day: 'Monday', mode: 'cook', locked: false,
  meal: { meal: 'Spaghetti', category: 'Italian', where: 'Home', healthy: true, speed: 'Quick', cost: '$', special: '' } };
const EATOUT_DAY = { day: 'Tuesday', mode: 'eatout', locked: false,
  meal: { meal: 'Sushi', category: 'Asian', where: 'Eat Out', healthy: false, speed: 'N/A', cost: '$$$', special: 'Tuesdays' } };
const EITHER_DAY = { day: 'Wednesday', mode: 'cook', locked: false,
  meal: { meal: 'Burgers', category: 'American', where: 'Either', healthy: false, speed: 'Quick', cost: '$$', special: '' } };

test('every core icon exists and is an svg using currentColor', () => {
  for (const name of ['calendar', 'bag', 'utensils', 'refresh', 'leaf', 'tag', 'home', 'list', 'thumbUp', 'thumbDown']) {
    assert.ok(ICONS[name], `missing icon: ${name}`);
    assert.match(ICONS[name], /^<svg[\s\S]*<\/svg>$/);
    assert.match(ICONS[name], /currentColor/);
  }
});

test('dayCardHTML renders meal, category/speed/cost pills and day label', () => {
  const html = dayCardHTML(COOK_DAY, 0);
  assert.match(html, /Spaghetti/);
  assert.match(html, /Italian/);
  assert.match(html, /MONDAY/);
  assert.match(html, /pill-speed[^>]*>Quick/);
  assert.match(html, /pill-cost[^>]*>\$/);
  assert.match(html, /class="card cook"/);
  assert.match(html, /badge-cook/);
});

test('dayCardHTML marks bought day with BOUGHT label and a Special/Sale pill', () => {
  const html = dayCardHTML(EATOUT_DAY, 1);
  assert.match(html, /class="card eatout"/);
  assert.match(html, /BOUGHT/);
  assert.doesNotMatch(html, /EAT OUT/);
  assert.match(html, /pill-special[^>]*>[\s\S]*Tuesdays/);
  assert.match(html, /pill-cost[^>]*>\$\$\$/);
  assert.doesNotMatch(html, /pill-speed/);
  assert.match(html, /badge-eatout/);
});

test('dayCardHTML shows a healthy pill only for healthy meals', () => {
  assert.match(dayCardHTML(COOK_DAY, 0), /pill-healthy/);
  assert.doesNotMatch(dayCardHTML(EATOUT_DAY, 1), /pill-healthy/);
});

test('shoppingRowHTML reflects checked + staple state', () => {
  const html = shoppingRowHTML({ name: 'Garlic', key: 'garlic', meals: ['Spaghetti'], staple: true }, true);
  assert.match(html, /data-key="garlic"/);
  assert.match(html, /checked/);
  assert.match(html, /staple/);
});

test('mealRowHTML lists name, category, where, speed and cost', () => {
  const html = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either',
    healthy: false, speed: 'Quick', cost: '$$', special: '', ingredients: ['pork'] });
  assert.match(html, /Tacos/);
  assert.match(html, /Mexican/);
  assert.match(html, /Either/);
  assert.match(html, /pill-speed[^>]*>Quick/);
  assert.match(html, /pill-cost[^>]*>\$\$/);
});

test('dayCardHTML badge reflects where: home / pot(either) / utensils(bought)', () => {
  assert.match(dayCardHTML(COOK_DAY, 0), /badge-cook/);
  assert.match(dayCardHTML(EITHER_DAY, 2), /badge-either/);
  assert.match(dayCardHTML(EATOUT_DAY, 1), /badge-eatout/);
});

test('weekStripHTML shows day + date, marks today, and omits meal names', () => {
  const plan = { days: [COOK_DAY, EATOUT_DAY, EITHER_DAY], relaxations: [], healthyCount: 0 };
  const html = weekStripHTML(plan, { dayNums: [1, 2, 3], todayIndex: 1 });
  assert.match(html, /data-action="goto-day"/);
  assert.match(html, /data-day="2"/);
  assert.match(html, /MON/i);
  assert.match(html, /ws-date">1</);
  assert.match(html, /is-today/);
  assert.doesNotMatch(html, /Spaghetti/); // no meal names in the strip anymore
  assert.equal(weekStripHTML({ days: [] }), '');
});

test('dayCardHTML readOnly drops the per-day action buttons', () => {
  const ro = dayCardHTML(COOK_DAY, 0, { readOnly: true });
  assert.doesNotMatch(ro, /card-actions/);
  assert.doesNotMatch(ro, /data-action="swap"/);
  assert.match(ro, /Spaghetti/);
  assert.match(dayCardHTML(COOK_DAY, 0), /card-actions/);
});

test('evaluateOverride flags back-to-back category and bought overflow', () => {
  const plan = { days: [
    { day: 'Monday', mode: 'cook', meal: { meal: 'A', category: 'Italian', where: 'Home' } },
    { day: 'Tuesday', mode: 'eatout', meal: { meal: 'B', category: 'Asian', where: 'Eat Out' } },
    { day: 'Wednesday', mode: 'eatout', meal: { meal: 'C', category: 'Mexican', where: 'Eat Out' } },
  ], relaxations: [], healthyCount: 0 };
  assert.match(evaluateOverride(plan, 0, { meal: 'D', category: 'Asian', where: 'Home' }), /back-to-back|adjacent/i);
  assert.match(evaluateOverride(plan, 0, { meal: 'E', category: 'Greek', where: 'Eat Out' }), /bought/i);
  assert.equal(evaluateOverride(plan, 0, { meal: 'F', category: 'Greek', where: 'Home' }), '');
});

test('dayCardHTML uses a compact head with inline actions and no footer', () => {
  const html = dayCardHTML(COOK_DAY, 0);
  assert.match(html, /class="card-head"/);
  assert.match(html, /class="card-actions"/);
  assert.match(html, /data-action="swap"/);
  assert.match(html, /data-action="pick"/);
  assert.doesNotMatch(html, /card-footer/);
  assert.doesNotMatch(html, /change-label/);
  assert.doesNotMatch(html, /data-action="lock"/);
  assert.doesNotMatch(html, /<select/);
});

test('mealRowHTML renders thumb up/down reflecting current rating', () => {
  const up = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either', healthy: false, ingredients: ['pork'] }, 'up');
  assert.match(up, /data-action="rate"/);
  assert.match(up, /data-meal="Tacos"/);
  assert.match(up, /data-rate="up"[^>]*aria-pressed="true"/);
  const none = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either', healthy: false, ingredients: ['pork'] });
  assert.match(none, /data-rate="up"[^>]*aria-pressed="false"/);
});

test('pickerSheetHTML lists every meal as a pick option for the given day', () => {
  const meals = [
    { meal: 'Tacos', category: 'Mexican' },
    { meal: 'Sushi', category: 'Japanese' },
  ];
  const html = pickerSheetHTML(2, meals);
  assert.match(html, /data-action="pick-meal"/);
  assert.match(html, /data-day="2"/);
  assert.match(html, /Tacos/);
  assert.match(html, /Sushi/);
});

test('pickerSheetHTML escapes meal names with special characters', () => {
  const html = pickerSheetHTML(0, [{ meal: 'Mac "n" Cheese & Co <x>', category: 'Comfort' }]);
  assert.doesNotMatch(html, /data-meal="Mac "n"/);   // raw quote would break the attribute
  assert.match(html, /&quot;n&quot;/);
  assert.match(html, /&amp;/);
  assert.match(html, /&lt;x&gt;/);
});
