import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/icons.js';
import { dayCardHTML, shoppingRowHTML, mealRowHTML } from '../src/render.js';

const COOK_DAY = { day: 'Monday', mode: 'cook', locked: false,
  meal: { meal: 'Spaghetti', category: 'Italian', healthy: true } };
const EATOUT_DAY = { day: 'Tuesday', mode: 'eatout', locked: false,
  meal: { meal: 'Sushi', category: 'Japanese', healthy: false } };

test('every core icon exists and is an svg using currentColor', () => {
  for (const name of ['calendar', 'cart', 'utensils', 'refresh', 'leaf', 'tag']) {
    assert.ok(ICONS[name], `missing icon: ${name}`);
    assert.match(ICONS[name], /^<svg[\s\S]*<\/svg>$/);
    assert.match(ICONS[name], /currentColor/);
  }
});

test('dayCardHTML renders meal, category pill and day label', () => {
  const html = dayCardHTML(COOK_DAY, 0, null);
  assert.match(html, /Spaghetti/);
  assert.match(html, /Italian/);
  assert.match(html, /MONDAY/);
  assert.match(html, /class="card cook"/);
});

test('dayCardHTML marks eat-out and renders a deal pill when given a deal', () => {
  const html = dayCardHTML(EATOUT_DAY, 1, { restaurant: 'Taqueria', deal: 'Taco Tuesday' });
  assert.match(html, /class="card eatout"/);
  assert.match(html, /EAT OUT/);
  assert.match(html, /Taco Tuesday/);
});

test('dayCardHTML shows a healthy pill only for healthy meals', () => {
  assert.match(dayCardHTML(COOK_DAY, 0, null), /pill-healthy/);
  assert.doesNotMatch(dayCardHTML(EATOUT_DAY, 1, null), /pill-healthy/);
});

test('shoppingRowHTML reflects checked + staple state', () => {
  const html = shoppingRowHTML({ name: 'Garlic', key: 'garlic', meals: ['Spaghetti'], staple: true }, true);
  assert.match(html, /data-key="garlic"/);
  assert.match(html, /checked/);
  assert.match(html, /staple/);
});

test('mealRowHTML lists name, category and where', () => {
  const html = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either', healthy: false, ingredients: ['pork'] });
  assert.match(html, /Tacos/);
  assert.match(html, /Mexican/);
  assert.match(html, /Either/);
});
