import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeals } from '../src/model.js';

// Transposed: row 0 is meal names ("Dinner", meal1, meal2, ...); every other
// row is one attribute keyed by its first cell. Last meal column is blank
// (should be skipped).
const MEAL_ROWS = [
  ['Dinner', 'Spaghetti', 'Sushi', 'Tacos', ''],
  ['Type', 'Italian', 'Asian', 'Mexican', ''],
  ['Bought / Made', 'Homemade', 'Bought', 'Either', ''],
  ['Special / Sale', '', '', 'Tuesdays', ''],
  ['Speed', 'Quick', 'Slow', 'N/A', ''],
  ['Cost', '$', '$$$', '', ''],
  ['Healthy', 'No', 'Yes', 'no', ''],
  ['Ingredients', 'spaghetti, meatballs, tomato sauce', 'rice, nori', '', ''],
];

test('parseMeals reads one meal per column and skips blank names', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals.length, 3);
  assert.deepEqual(meals[0], {
    meal: 'Spaghetti',
    category: 'Italian',
    where: 'Home',
    healthy: false,
    speed: 'Quick',
    cost: '$',
    special: '',
    ingredients: ['spaghetti', 'meatballs', 'tomato sauce'],
  });
});

test('parseMeals maps Bought -> Eat Out and parses new fields', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals[1].where, 'Eat Out');   // "Bought"
  assert.equal(meals[1].healthy, true);
  assert.equal(meals[1].speed, 'Slow');
  assert.equal(meals[1].cost, '$$$');
  assert.deepEqual(meals[1].ingredients, ['rice', 'nori']);
});

test('parseMeals handles Either, blank cost, special text, and empty ingredients', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals[2].where, 'Either');
  assert.equal(meals[2].special, 'Tuesdays');
  assert.equal(meals[2].cost, '');
  assert.deepEqual(meals[2].ingredients, []);
});

test('parseMeals is independent of row order (keyed by attribute label)', () => {
  const shuffled = [MEAL_ROWS[0], MEAL_ROWS[6], MEAL_ROWS[2], MEAL_ROWS[4],
    MEAL_ROWS[1], MEAL_ROWS[7], MEAL_ROWS[3], MEAL_ROWS[5]];
  assert.deepEqual(parseMeals(shuffled), parseMeals(MEAL_ROWS));
});

test('parseMeals defaults an unknown Bought/Made to Either and missing fields to empty', () => {
  const meals = parseMeals([
    ['Dinner', 'Mystery'],
    ['Type', ''],
    ['Bought / Made', 'whenever'],
  ]);
  assert.equal(meals[0].where, 'Either');
  assert.equal(meals[0].category, 'Other');
  assert.equal(meals[0].healthy, false);
  assert.equal(meals[0].speed, '');
  assert.equal(meals[0].cost, '');
  assert.equal(meals[0].special, '');
  assert.deepEqual(meals[0].ingredients, []);
});

test('parseMeals returns [] for too-few rows or a missing Dinner row', () => {
  assert.deepEqual(parseMeals([]), []);
  assert.deepEqual(parseMeals([['Dinner', 'X']]), []);          // < 2 rows
  assert.deepEqual(parseMeals([['Type', 'Italian'], ['Cost', '$']]), []); // no Dinner row
});
