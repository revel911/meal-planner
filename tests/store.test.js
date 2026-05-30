import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../src/store.js';

test('round-trips a plan as JSON', async () => {
  const store = createStore(memoryBackend());
  const plan = { days: [{ day: 'Monday' }], relaxations: [], healthyCount: 0 };
  await store.setPlan(plan);
  assert.deepEqual(await store.getPlan(), plan);
});

test('getPlan returns null when nothing saved', async () => {
  const store = createStore(memoryBackend());
  assert.equal(await store.getPlan(), null);
});

test('staples default to config when unset, then persist', async () => {
  const store = createStore(memoryBackend());
  const def = await store.getStaples();
  assert.ok(Array.isArray(def) && def.length > 0);
  await store.setStaples(['rice', 'oil']);
  assert.deepEqual(await store.getStaples(), ['rice', 'oil']);
});

test('checked round-trips and defaults to []', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getChecked(), []);
  await store.setChecked(['rice']);
  assert.deepEqual(await store.getChecked(), ['rice']);
});

test('memoryBackend can seed initial values', async () => {
  const store = createStore(memoryBackend({ 'mp:ratings': JSON.stringify({ X: 'up' }) }));
  assert.deepEqual(await store.getRatings(), { X: 'up' });
});

test('history defaults to [], pushes most-recent-first and caps at 3', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getHistory(), []);
  assert.deepEqual(await store.pushHistory(['A', 'B']), [['A', 'B']]);
  await store.pushHistory(['C']);
  await store.pushHistory(['D']);
  const capped = await store.pushHistory(['E']);
  assert.equal(capped.length, 3, 'capped at 3 weeks');
  assert.deepEqual(capped[0], ['E'], 'newest first');
  assert.deepEqual(await store.getHistory(), capped);
});

test('history falls back to the legacy lastWeek key once', async () => {
  const store = createStore(memoryBackend({ 'mp:lastweek': JSON.stringify(['Tacos']) }));
  assert.deepEqual(await store.getHistory(), [['Tacos']]);
});

test('ratings default to {}, set, overwrite and clear to neutral', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getRatings(), {});
  await store.setRating('Tacos', 'up');
  await store.setRating('Sushi', 'down');
  assert.deepEqual(await store.getRatings(), { Tacos: 'up', Sushi: 'down' });
  await store.setRating('Tacos', 'neutral'); // neutral removes the entry
  assert.deepEqual(await store.getRatings(), { Sushi: 'down' });
});
