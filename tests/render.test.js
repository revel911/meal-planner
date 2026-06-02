import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/icons.js';
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride, pickerSheetHTML } from '../src/render.js';

const COOK_DAY = { day: 'Monday', mode: 'cook', locked: false,
  meal: { meal: 'Spaghetti', category: 'Italian', healthy: true, speed: 'Quick', cost: '$', special: '' } };
const EATOUT_DAY = { day: 'Tuesday', mode: 'eatout', locked: false,
  meal: { meal: 'Sushi', category: 'Asian', healthy: false, speed: 'N/A', cost: '$$$', special: 'Tuesdays' } };

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

test('evaluateOverride flags a duplicate category and eat-out overflow', () => {
  const plan = { days: [
    { day: 'Monday', mode: 'cook', meal: { meal: 'A', category: 'Italian', where: 'Home', healthy: false, ingredients: [] } },
    { day: 'Tuesday', mode: 'eatout', meal: { meal: 'B', category: 'Japanese', where: 'Eat Out', healthy: false, ingredients: [] } },
    { day: 'Wednesday', mode: 'eatout', meal: { meal: 'C', category: 'Mexican', where: 'Eat Out', healthy: false, ingredients: [] } },
  ], relaxations: [], healthyCount: 0 };
  // Overriding Monday with a Japanese meal -> clashes with Tuesday's category.
  const dup = evaluateOverride(plan, 0, { meal: 'D', category: 'Japanese', where: 'Home' });
  assert.match(dup, /category/i);
  // Overriding Monday with a 3rd eat-out -> exceeds cap of 2.
  const over = evaluateOverride(plan, 0, { meal: 'E', category: 'Greek', where: 'Eat Out' });
  assert.match(over, /eat-out/i);
  // A clean pick (category not used on any OTHER day) -> empty string.
  assert.equal(evaluateOverride(plan, 0, { meal: 'F', category: 'Greek', where: 'Home' }), '');
  // Replacing Monday's Italian with a different Italian is NOT a duplicate (same slot).
  assert.equal(evaluateOverride(plan, 0, { meal: 'G', category: 'Italian', where: 'Home' }), '');
});

test('dayCardHTML has Change footer with shuffle + list, and no dropdown or lock', () => {
  const html = dayCardHTML(COOK_DAY, 0);
  assert.match(html, /data-action="swap"/);
  assert.match(html, /data-action="pick"/);
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
