import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/defaults.js';
import {
  buildDescription,
  buildTitle,
  generate,
  recordSale,
  remaining,
  setStatus,
  undoLastSale,
  pendingTakedowns,
  duplicateItem,
} from '../js/logic.js';

function makeItem(state, typeId, values = {}, extra = {}) {
  const type = state.productTypes.find((t) => t.id === typeId);
  const item = {
    id: 'i1',
    typeId,
    values: { ...type.defaults, ...values },
    blockToggles: {},
    extraText: '',
    price: '120',
    quantity: 1,
    sales: [],
    listings: [],
    createdAt: 0,
    ...extra,
  };
  state.items.push(item);
  return item;
}

test('3DS description uses German warranty text on Kleinanzeigen, Austrian on Willhaben', () => {
  const state = defaultState();
  const item = makeItem(state, '3ds', { color: 'Schwarz' });
  const ka = buildDescription(state, item, 'kleinanzeigen');
  const wh = buildDescription(state, item, 'willhaben');
  assert.match(ka, /Japanischer Nintendo New 3DS XL in Schwarz/);
  assert.match(ka, /Inklusive 32 GB SD-Karte/);
  assert.match(ka, /Sachmängelhaftung/);
  assert.doesNotMatch(ka, /Gewährleistung wird ausgeschlossen/);
  assert.match(wh, /Gewährleistung wird ausgeschlossen/);
  assert.doesNotMatch(wh, /Sachmängelhaftung/);
  assert.doesNotMatch(ka, /Systemmenü/, 'off-by-default block is not included');
  assert.doesNotMatch(ka, /Mängel:/, 'defects block is skipped when empty');
});

test('per-item block toggle and empty SD card', () => {
  const state = defaultState();
  const item = makeItem(state, '3ds', { sd_size: '' });
  item.blockToggles['3ds-menu-jp'] = true;
  const d = buildDescription(state, item, 'ebay');
  assert.doesNotMatch(d, /SD-Karte/);
  assert.match(d, /Systemmenü/);
  assert.equal(buildTitle(state, item, 'ebay'), 'Nintendo New 3DS XL – Japan, Region Free');
});

test('eBay title length check', () => {
  const state = defaultState();
  const item = makeItem(state, 'ipod', { capacity: '256 GB' });
  const out = generate(state, item, 'ebay-1');
  assert.equal(out.title, 'Apple iPod Classic 7G 256 GB Silber');
  assert.equal(out.titleMax, 80);
  assert.equal(out.titleTooLong, false);
  assert.equal(out.price, 120);
});

test('platform markup and per-listing price override', () => {
  const state = defaultState();
  state.platforms.ebay.markupPct = 10;
  const item = makeItem(state, 'vita-card');
  assert.equal(generate(state, item, 'ebay-1').price, 132);
  assert.equal(generate(state, item, 'ka-1').price, 120);
  setStatus(item, 'ka-1', 'draft').price = '99';
  assert.equal(generate(state, item, 'ka-1').price, 99);
});

test('selling the last unit flags every other live listing for take-down', () => {
  const state = defaultState();
  const item = makeItem(state, 'ipod');
  setStatus(item, 'ebay-1', 'live');
  setStatus(item, 'ka-1', 'live');
  setStatus(item, 'vinted-1', 'live');
  setStatus(item, 'wh-1', 'draft');

  const down = recordSale(item, 'ka-1');
  assert.equal(remaining(item), 0);
  assert.deepEqual(down.map((l) => l.accountId).sort(), ['ebay-1', 'vinted-1']);
  const status = Object.fromEntries(item.listings.map((l) => [l.accountId, l.status]));
  assert.deepEqual(status, { 'ebay-1': 'takedown', 'ka-1': 'sold', 'vinted-1': 'takedown', 'wh-1': 'removed' });
  assert.equal(pendingTakedowns(state).length, 2);
});

test('with stock left, listings stay live', () => {
  const state = defaultState();
  const item = makeItem(state, 'vita-card', {}, { quantity: 3 });
  setStatus(item, 'ebay-1', 'live');
  setStatus(item, 'ka-1', 'live');
  assert.deepEqual(recordSale(item, 'ebay-1'), []);
  assert.deepEqual(recordSale(item, 'ka-1'), []);
  assert.equal(remaining(item), 1);
  assert.ok(item.listings.every((l) => l.status === 'live'));
  assert.equal(recordSale(item, 'ka-1').length, 1);
  assert.equal(item.listings.find((l) => l.accountId === 'ebay-1').status, 'takedown');
});

test('undo last sale restores live listings', () => {
  const state = defaultState();
  const item = makeItem(state, 'ipod');
  setStatus(item, 'ebay-1', 'live');
  setStatus(item, 'ka-1', 'live');
  recordSale(item, 'ebay-1');
  undoLastSale(item);
  assert.equal(remaining(item), 1);
  assert.ok(item.listings.every((l) => l.status === 'live'));
});

test('duplicate keeps details, drops listings and sales', () => {
  const state = defaultState();
  const item = makeItem(state, 'ipod');
  setStatus(item, 'ebay-1', 'live');
  recordSale(item, 'ebay-1');
  const copy = duplicateItem(item);
  assert.notEqual(copy.id, item.id);
  assert.deepEqual(copy.values, item.values);
  assert.deepEqual(copy.listings, []);
  assert.deepEqual(copy.sales, []);
});
