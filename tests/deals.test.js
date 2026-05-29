import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dealForDay } from '../src/deals.js';

const DEALS = [
  { day: 'Tuesday', restaurant: 'Taqueria', deal: 'Taco Tuesday', notes: '' },
  { day: 'friday', restaurant: 'Wing Co', deal: 'Wing Night', notes: '' },
];

test('matches by day name, case-insensitive', () => {
  assert.equal(dealForDay(DEALS, 'Tuesday').deal, 'Taco Tuesday');
  assert.equal(dealForDay(DEALS, 'Friday').restaurant, 'Wing Co');
});

test('returns null when no deal for the day or deals empty', () => {
  assert.equal(dealForDay(DEALS, 'Monday'), null);
  assert.equal(dealForDay([], 'Tuesday'), null);
  assert.equal(dealForDay(null, 'Tuesday'), null);
});
