import test from 'node:test';
import assert from 'node:assert/strict';
import { fill, fillLenient, placeholders } from '../js/template.js';

test('fills placeholders', () => {
  assert.equal(fill('Inklusive {sd_size} GB SD-Karte.', { sd_size: '64' }), 'Inklusive 64 GB SD-Karte.');
});

test('skips the whole block when a required value is empty', () => {
  assert.equal(fill('Inklusive {sd_size} GB SD-Karte.', { sd_size: '' }), null);
  assert.equal(fill('Mängel: {defects}', {}), null);
});

test('drops only the optional segment when its value is empty', () => {
  const t = 'Versand als Paket[[ oder Abholung in {city}]].';
  assert.equal(fill(t, { city: 'Berlin' }), 'Versand als Paket oder Abholung in Berlin.');
  assert.equal(fill(t, { city: '' }), 'Versand als Paket.');
});

test('lenient fill keeps titles clean', () => {
  const t = 'Nintendo {model}[[ {color}]] – Japan, Region Free[[, {sd_size} GB SD]]';
  assert.equal(fillLenient(t, { model: 'New 3DS XL', sd_size: '' }), 'Nintendo New 3DS XL – Japan, Region Free');
  assert.equal(
    fillLenient(t, { model: 'New 3DS XL', color: 'Blau', sd_size: '32' }),
    'Nintendo New 3DS XL Blau – Japan, Region Free, 32 GB SD',
  );
});

test('lists placeholders', () => {
  assert.deepEqual(placeholders('{a} [[{b}]] {a}'), ['a', 'b']);
});
