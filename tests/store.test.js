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

test('lastWeek + checked round-trip and default to []', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getLastWeek(), []);
  await store.setLastWeek(['Tacos']);
  assert.deepEqual(await store.getLastWeek(), ['Tacos']);
  assert.deepEqual(await store.getChecked(), []);
  await store.setChecked(['rice']);
  assert.deepEqual(await store.getChecked(), ['rice']);
});

test('memoryBackend can seed initial values', async () => {
  const store = createStore(memoryBackend({ 'mp:lastweek': JSON.stringify(['X']) }));
  assert.deepEqual(await store.getLastWeek(), ['X']);
});
