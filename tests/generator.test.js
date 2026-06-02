import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, rerollDay, countHealthy, ratingWeight, recencyWeight } from '../src/generator.js';

// 8 distinct categories, 1 eat-out, 1 healthy.
const MEALS = [
  { meal: 'Spaghetti', category: 'Italian', ingredients: ['pasta'], where: 'Home', healthy: true },
  { meal: 'Tikka', category: 'Indian', ingredients: ['chicken'], where: 'Home', healthy: false },
  { meal: 'Tacos', category: 'Mexican', ingredients: ['pork'], where: 'Either', healthy: false },
  { meal: 'Pad Thai', category: 'Thai', ingredients: ['noodles'], where: 'Either', healthy: false },
  { meal: 'Burgers', category: 'American', ingredients: ['beef'], where: 'Either', healthy: false },
  { meal: 'Sushi', category: 'Japanese', ingredients: ['rice'], where: 'Eat Out', healthy: false },
  { meal: 'Beef Broccoli', category: 'Chinese', ingredients: ['steak'], where: 'Home', healthy: false },
  { meal: 'Gyros', category: 'Greek', ingredients: ['pita'], where: 'Either', healthy: false },
];

// 5 categories x 2 meals = forces categories to repeat across 7 days.
const FEW_CAT = ['Italian', 'Mexican', 'Seafood', 'American', 'Asian'].flatMap((c) =>
  [1, 2].map((n) => ({ meal: `${c}${n}`, category: c, ingredients: [], where: 'Home', healthy: false })));

const noShuffle = () => 0;
function lcg(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

function noBackToBack(plan) {
  for (let i = 1; i < plan.days.length; i++) {
    if (plan.days[i].meal.category === plan.days[i - 1].meal.category) return false;
  }
  return true;
}

test('generates a 7-day Mon-Sun week with distinct meals and no back-to-back category', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.equal(plan.days.length, 7);
  assert.deepEqual(plan.days.map((d) => d.day),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  assert.equal(new Set(plan.days.map((d) => d.meal.meal)).size, 7, 'meals are distinct');
  assert.ok(noBackToBack(plan), 'no two consecutive days share a category');
});

test('avoids back-to-back categories even when categories must repeat', () => {
  for (let s = 0; s < 30; s++) {
    const plan = generateWeek(FEW_CAT, [], { rng: lcg(s + 1), healthyTarget: 0 });
    assert.equal(plan.days.length, 7);
    assert.ok(noBackToBack(plan), `back-to-back found for seed ${s}`);
    assert.ok(new Set(plan.days.map((d) => d.meal.category)).size < 7);
  }
});

test('respects the eat-out cap (<= 2 eatout days)', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.ok(plan.days.filter((d) => d.mode === 'eatout').length <= 2);
});

test('relaxes the healthy rule (lowest priority) when target is unreachable', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 3 });
  assert.deepEqual(plan.relaxations, ['healthy']);
  assert.equal(plan.healthyCount, countHealthy(plan));
});

test('excludes the most-recent week unless repeat must be relaxed', () => {
  const history = [['Spaghetti', 'Tikka']];
  const plan = generateWeek(MEALS, history, { rng: noShuffle, healthyTarget: 0 });
  assert.ok(plan.relaxations.includes('repeat'));
});

test('a deal meal only ever lands on its deal day', () => {
  const meals = FEW_CAT.map((m) => (m.meal === 'Mexican1' ? { ...m, dealDay: 1 } : m));
  for (let s = 0; s < 50; s++) {
    const plan = generateWeek(meals, [], { rng: lcg(s + 1), healthyTarget: 0 });
    const idx = plan.days.findIndex((d) => d.meal.meal === 'Mexican1');
    if (idx >= 0) assert.equal(idx, 1, `Mexican1 at day ${idx} for seed ${s}`);
  }
});

test('a deal pin may break back-to-back (deals win over spacing)', () => {
  const meals = [
    { meal: 'TacoTue', category: 'Mexican', where: 'Home', healthy: false, ingredients: [], dealDay: 1 },
    { meal: 'EmpWed', category: 'Mexican', where: 'Home', healthy: false, ingredients: [], dealDay: 2 },
    { meal: 'A', category: 'Italian', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'B', category: 'Seafood', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'C', category: 'American', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'D', category: 'Asian', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'E', category: 'Greek', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'F', category: 'Thai', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'G', category: 'French', where: 'Home', healthy: false, ingredients: [] },
  ];
  const plan = generateWeek(meals, [], { rng: noShuffle, healthyTarget: 0 });
  assert.equal(plan.days[1].meal.meal, 'TacoTue');
  assert.equal(plan.days[2].meal.meal, 'EmpWed');
  assert.equal(plan.days[1].meal.category, plan.days[2].meal.category);
});

test('rerollDay swaps one day for an eligible different meal, keeping others', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 0 });
  const before = plan.days[2].meal.meal;
  const next = rerollDay(plan, 2, MEALS, { rng: () => 0.5 });
  assert.notEqual(next.days[2].meal.meal, before);
  assert.equal(next.days[0].meal.meal, plan.days[0].meal.meal);
});

test('ratingWeight boosts up, penalizes down, neutral is 1', () => {
  assert.equal(ratingWeight('Tacos', { Tacos: 'up' }), 2.5);
  assert.equal(ratingWeight('Tacos', { Tacos: 'down' }), 0.25);
  assert.equal(ratingWeight('Tacos', {}), 1);
  assert.equal(ratingWeight('Tacos', undefined), 1);
});

test('recencyWeight fades meals seen 2-3 weeks ago, full for unseen', () => {
  const history = [['Recent'], ['TwoAgo'], ['ThreeAgo']];
  assert.equal(recencyWeight('TwoAgo', history), 0.25);
  assert.equal(recencyWeight('ThreeAgo', history), 0.5);
  assert.equal(recencyWeight('Unseen', history), 1);
  assert.equal(recencyWeight('Recent', history), 1);
});

test('thumbs-up meals are chosen more often than thumbs-down over many draws', () => {
  const rng = lcg(1);
  const ratings = { Spaghetti: 'up', Gyros: 'down' };
  let up = 0, down = 0;
  for (let i = 0; i < 200; i++) {
    const names = generateWeek(MEALS, [], { rng, ratings, healthyTarget: 0 }).days.map((d) => d.meal.meal);
    if (names.includes('Spaghetti')) up++;
    if (names.includes('Gyros')) down++;
  }
  assert.ok(up > down, `expected up(${up}) > down(${down})`);
});
