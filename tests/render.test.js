import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/icons.js';

test('every core icon exists and is an svg using currentColor', () => {
  for (const name of ['calendar', 'cart', 'utensils', 'refresh', 'leaf', 'tag']) {
    assert.ok(ICONS[name], `missing icon: ${name}`);
    assert.match(ICONS[name], /^<svg[\s\S]*<\/svg>$/);
    assert.match(ICONS[name], /currentColor/);
  }
});
