import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, rerollDay, regenerateUnlocked, countHealthy, ratingWeight, recencyWeight } from '../src/generator.js';

// 8 distinct categories, 1 eat-out, 1 healthy — mirrors the real seed Sheet.
const MEALS = [
  { meal: 'Spaghetti', category: 'Italian', ingredients: ['pasta'], where: 'Home', healthy: true, notes: '' },
  { meal: 'Tikka', category: 'Indian', ingredients: ['chicken'], where: 'Home', healthy: false, notes: '' },
  { meal: 'Tacos', category: 'Mexican', ingredients: ['pork'], where: 'Either', healthy: false, notes: '' },
  { meal: 'Pad Thai', category: 'Thai', ingredients: ['noodles'], where: 'Either', healthy: false, notes: '' },
  { meal: 'Burgers', category: 'American', ingredients: ['beef'], where: 'Either', healthy: false, notes: '' },
  { meal: 'Sushi', category: 'Japanese', ingredients: ['rice'], where: 'Eat Out', healthy: false, notes: '' },
  { meal: 'Beef Broccoli', category: 'Chinese', ingredients: ['steak'], where: 'Home', healthy: false, notes: '' },
  { meal: 'Gyros', category: 'Greek', ingredients: ['pita'], where: 'Either', healthy: false, notes: '' },
];

// Deterministic identity "rng": shuffle becomes a no-op, so order is stable.
const noShuffle = () => 0;

test('generates a 7-day Mon-Sun week with distinct meals and categories', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.equal(plan.days.length, 7);
  assert.deepEqual(plan.days.map((d) => d.day),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const names = plan.days.map((d) => d.meal.meal);
  assert.equal(new Set(names).size, 7, 'meals are distinct');
  const cats = plan.days.map((d) => d.meal.category);
  assert.equal(new Set(cats).size, 7, 'categories are distinct');
});

test('respects the eat-out cap (<= 2 eatout days)', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.ok(plan.days.filter((d) => d.mode === 'eatout').length <= 2);
});

test('relaxes the healthy rule (lowest priority) when target is unreachable', () => {
  // Only 1 healthy meal exists, target is 3 -> must relax 'healthy', nothing else.
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 3 });
  assert.deepEqual(plan.relaxations, ['healthy']);
  assert.equal(plan.healthyCount, countHealthy(plan));
});

test('excludes the most-recent week unless repeat must be relaxed', () => {
  const history = [['Spaghetti', 'Tikka']]; // most-recent week, as array-of-weeks
  const plan = generateWeek(MEALS, history, { rng: noShuffle, healthyTarget: 0 });
  // With 8 meals and 2 excluded, 6 remain < 7 -> repeat relaxed.
  assert.ok(plan.relaxations.includes('repeat'));
});

test('rerollDay swaps one day for an eligible different meal, keeping others', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 0 });
  const before = plan.days[2].meal.meal;
  const next = rerollDay(plan, 2, MEALS, { rng: () => 0.5 });
  assert.notEqual(next.days[2].meal.meal, before);
  // other days unchanged
  assert.equal(next.days[0].meal.meal, plan.days[0].meal.meal);
});

test('regenerateUnlocked keeps locked days and re-rolls the rest', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 0 });
  plan.days[0].locked = true;
  const lockedMeal = plan.days[0].meal.meal;
  const next = regenerateUnlocked(plan, MEALS, { rng: () => 0.3, healthyTarget: 0 });
  assert.equal(next.days[0].meal.meal, lockedMeal);
  assert.equal(next.days.length, 7);
});

test('ratingWeight boosts up, penalizes down, neutral is 1', () => {
  assert.equal(ratingWeight('Tacos', { Tacos: 'up' }), 2.5);
  assert.equal(ratingWeight('Tacos', { Tacos: 'down' }), 0.25);
  assert.equal(ratingWeight('Tacos', {}), 1);
  assert.equal(ratingWeight('Tacos', undefined), 1);
});

test('recencyWeight fades meals seen 2-3 weeks ago, full for unseen', () => {
  // history is most-recent-first: [week-1, week-2, week-3]
  const history = [['Recent'], ['TwoAgo'], ['ThreeAgo']];
  assert.equal(recencyWeight('TwoAgo', history), 0.25);
  assert.equal(recencyWeight('ThreeAgo', history), 0.5);
  assert.equal(recencyWeight('Unseen', history), 1);
  // most-recent week is handled by the pool filter, not the weight -> treated as full here
  assert.equal(recencyWeight('Recent', history), 1);
});

test('thumbs-up meals are chosen more often than thumbs-down over many draws', () => {
  // Deterministic-but-varied rng so weightedShuffle actually differentiates.
  let seed = 1;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const ratings = { Spaghetti: 'up', Gyros: 'down' };
  let up = 0, down = 0;
  for (let i = 0; i < 200; i++) {
    const plan = generateWeek(MEALS, [], { rng, ratings, healthyTarget: 0 });
    const names = plan.days.map((d) => d.meal.meal);
    if (names.includes('Spaghetti')) up++;
    if (names.includes('Gyros')) down++;
  }
  assert.ok(up > down, `expected up(${up}) > down(${down})`);
});
