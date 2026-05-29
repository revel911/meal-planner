import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeals, parseDeals } from '../src/model.js';

const MEAL_ROWS = [
  ['Meal', 'Category', 'Ingredients', 'Where', 'Healthy', 'Notes'],
  ['Spaghetti Bolognese', 'Italian', 'ground beef, onion, garlic', 'Home', 'Yes', ''],
  ['Sushi Night', 'Japanese', 'sushi rice, nori, salmon', 'Eat Out', 'no', 'date night'],
  ['', '', '', '', '', ''], // blank row should be skipped
];

test('parseMeals normalizes fields', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals.length, 2);
  assert.deepEqual(meals[0], {
    meal: 'Spaghetti Bolognese',
    category: 'Italian',
    ingredients: ['ground beef', 'onion', 'garlic'],
    where: 'Home',
    healthy: true,
    notes: '',
  });
});

test('parseMeals normalizes Where + Healthy casing', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals[1].where, 'Eat Out');
  assert.equal(meals[1].healthy, false);
  assert.equal(meals[1].notes, 'date night');
});

test('parseMeals defaults an unknown Where to Either', () => {
  const meals = parseMeals([
    ['Meal', 'Category', 'Ingredients', 'Where', 'Healthy', 'Notes'],
    ['Mystery', 'Other', 'stuff', 'whenever', '', ''],
  ]);
  assert.equal(meals[0].where, 'Either');
  assert.equal(meals[0].healthy, false);
});

test('parseDeals maps day rows and returns [] for header-only/empty', () => {
  const deals = parseDeals([
    ['Day', 'Restaurant', 'Deal', 'Notes'],
    ['Tuesday', 'Taqueria', 'Taco Tuesday', '$1 tacos'],
  ]);
  assert.deepEqual(deals, [{ day: 'Tuesday', restaurant: 'Taqueria', deal: 'Taco Tuesday', notes: '$1 tacos' }]);
  assert.deepEqual(parseDeals([['Day', 'Restaurant', 'Deal', 'Notes']]), []);
  assert.deepEqual(parseDeals([]), []);
});
