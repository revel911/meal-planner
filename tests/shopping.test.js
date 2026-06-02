import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAisle, buildShoppingList } from '../src/shopping.js';

test('classifyAisle buckets common ingredients', () => {
  assert.equal(classifyAisle('chicken thighs'), 'Meat & Seafood');
  assert.equal(classifyAisle('parmesan'), 'Dairy');
  assert.equal(classifyAisle('basmati rice'), 'Pantry');
  assert.equal(classifyAisle('red onion'), 'Produce');
  assert.equal(classifyAisle('toothpicks'), 'Other');
});

const PLAN = {
  days: [
    { day: 'Monday', mode: 'cook', meal: { meal: 'Spaghetti', ingredients: ['ground beef', 'onion', 'garlic'] } },
    { day: 'Tuesday', mode: 'cook', meal: { meal: 'Tikka', ingredients: ['chicken', 'onion'] } },
    { day: 'Wednesday', mode: 'eatout', meal: { meal: 'Sushi', ingredients: ['rice', 'nori'] } },
  ],
  relaxations: [], healthyCount: 0,
};

test('builds deduped list from cook days only, tracking source meals', () => {
  const groups = buildShoppingList(PLAN, []);
  const all = groups.flatMap((g) => g.items);
  // 'rice'/'nori' from the eat-out day are excluded.
  assert.ok(!all.some((i) => i.key === 'rice'));
  // 'onion' appears in two cook meals -> deduped, both meals tracked.
  const onion = all.find((i) => i.key === 'onion');
  assert.deepEqual(onion.meals.sort(), ['Spaghetti', 'Tikka']);
});

test('groups are returned in display order and skip empties', () => {
  const groups = buildShoppingList(PLAN, []);
  assert.deepEqual(groups.map((g) => g.aisle), ['Produce', 'Meat & Seafood']);
});

test('marks staples', () => {
  const groups = buildShoppingList(PLAN, ['garlic']);
  const all = groups.flatMap((g) => g.items);
  assert.equal(all.find((i) => i.key === 'garlic').staple, true);
  assert.equal(all.find((i) => i.key === 'onion').staple, false);
});

test('Bought (eat-out) meals never contribute to the list, even with ingredients', () => {
  const plan = {
    days: [
      { day: 'Monday', mode: 'cook', meal: { meal: 'Spaghetti', ingredients: ['ground beef'] } },
      { day: 'Tuesday', mode: 'eatout', meal: { meal: 'Empanadas', ingredients: ['dough', 'onion'] } },
    ],
    relaxations: [], healthyCount: 0,
  };
  const all = buildShoppingList(plan, []).flatMap((g) => g.items);
  assert.ok(all.some((i) => i.key === 'ground beef')); // cook meal included
  assert.ok(!all.some((i) => i.key === 'dough'));       // bought meal excluded
  assert.ok(!all.some((i) => i.key === 'onion'));        // bought meal excluded
});
