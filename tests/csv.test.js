import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../src/csv.js';

test('parses simple rows', () => {
  assert.deepEqual(parseCSV('a,b,c\n1,2,3'), [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('keeps commas inside quoted fields', () => {
  const rows = parseCSV('"Meal","Ingredients"\n"Pad Thai","noodles, shrimp, egg"');
  assert.deepEqual(rows[1], ['Pad Thai', 'noodles, shrimp, egg']);
});

test('handles escaped double-quotes and embedded newlines', () => {
  const rows = parseCSV('"a ""b"" c","line1\nline2"');
  assert.deepEqual(rows[0], ['a "b" c', 'line1\nline2']);
});

test('ignores a trailing newline and CRLF', () => {
  assert.deepEqual(parseCSV('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
});

test('returns [] for empty input', () => {
  assert.deepEqual(parseCSV(''), []);
});
