import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mondayOf, planningMonday, dateKey, dateFromKey, weeksBetween,
  weekDates, formatRange, todayIndex, relativeLabel,
} from '../src/dates.js';

test('mondayOf returns the Monday of the week (week starts Monday)', () => {
  const mon = mondayOf(new Date(2026, 5, 4)); // Thu Jun 4 2026
  assert.equal(mon.getFullYear(), 2026);
  assert.equal(mon.getMonth(), 5);
  assert.equal(mon.getDate(), 1);                       // -> Mon Jun 1
  assert.equal(mondayOf(new Date(2026, 5, 1)).getDate(), 1); // a Monday maps to itself
  assert.equal(mondayOf(new Date(2026, 5, 7)).getDate(), 1); // Sunday -> previous Monday
});

test('planningMonday rolls Sunday forward to the week starting tomorrow', () => {
  assert.equal(dateKey(planningMonday(new Date(2026, 7, 22))), '2026-08-17'); // Saturday
  assert.equal(dateKey(planningMonday(new Date(2026, 7, 23))), '2026-08-24'); // Sunday
  assert.equal(dateKey(planningMonday(new Date(2026, 7, 24))), '2026-08-24'); // Monday
});

test('date keys round-trip in local time and week distance is DST-safe', () => {
  assert.equal(dateKey(dateFromKey('2026-08-24')), '2026-08-24');
  assert.equal(dateFromKey('not-a-date'), null);
  assert.equal(weeksBetween(new Date(2026, 10, 9), new Date(2026, 9, 26)), 2);
});

test('weekDates yields 7 consecutive days Mon..Sun', () => {
  const dates = weekDates(mondayOf(new Date(2026, 5, 4)));
  assert.equal(dates.length, 7);
  assert.equal(dates[0].getDate(), 1);
  assert.equal(dates[6].getDate(), 7);
});

test('formatRange handles same-month and cross-month', () => {
  assert.equal(formatRange(weekDates(mondayOf(new Date(2026, 5, 4)))), 'Jun 1 – 7');
  assert.equal(formatRange(weekDates(mondayOf(new Date(2026, 5, 30)))), 'Jun 29 – Jul 5');
});

test('todayIndex finds today in-week, else -1', () => {
  const dates = weekDates(mondayOf(new Date(2026, 5, 4)));
  assert.equal(todayIndex(dates, new Date(2026, 5, 4)), 3); // Thu
  assert.equal(todayIndex(dates, new Date(2026, 5, 1)), 0); // Mon
  assert.equal(todayIndex(dates, new Date(2026, 6, 1)), -1); // next month
});

test('relativeLabel describes the offset', () => {
  const weekday = new Date(2026, 7, 20);
  assert.equal(relativeLabel(0, weekday), 'This week');
  assert.equal(relativeLabel(1, weekday), 'Last week');
  assert.equal(relativeLabel(2, weekday), '2 weeks ago');
});

test('relativeLabel calls the planning week Next week on Sunday', () => {
  const sunday = new Date(2026, 7, 23);
  assert.equal(relativeLabel(0, sunday), 'Next week');
  assert.equal(relativeLabel(1, sunday), 'This week');
  assert.equal(relativeLabel(2, sunday), 'Last week');
});
