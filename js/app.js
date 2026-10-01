import { load, save, migrate, exportJson, requestPersistentStorage } from './store.js';
import { defaultState } from './defaults.js';
import { fill, placeholders } from './template.js';
import {
  STATUS,
  uid,
  findType,
  findAccount,
  itemVars,
  isBlockOn,
  buildTitle,
  generate,
  remaining,
  soldCount,
  ensureListing,
  setStatus,
  recordSale,
  undoLastSale,
  pendingTakedowns,
  duplicateItem,
} from './logic.js';

let state = load();
const root = document.getElementById('app');
const ui = { filter: 'active', expanded: new Set() };

function persist() {
  if (!save(state)) toast('⚠️ Could not save – storage full or blocked?');
}

// ---- tiny DOM helper --------------------------------------------------------

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  const late = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value' || k === 'checked') late[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  Object.assign(el, late);
  return el;
}

function toast(msg) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

async function copy(text, what = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(`📋 ${what}`);
}

function go(hash) {
  location.hash = hash;
}

function platformName(p) {
  return state.platforms[p]?.name || p;
}

function itemLabel(item) {
  return buildTitle(state, item, 'default') || findType(state, item.typeId)?.name || 'Item';
}

function euro(v) {
  return v == null || v === '' || Number.isNaN(Number(v)) ? '–' : `${v} €`;
}

// ---- layout & routing -------------------------------------------------------

function render() {
  const [, view, id] = (location.hash || '#/items').split('/');
  const pending = pendingTakedowns(state).length;
  let main;
  if (view === 'item' && state.items.some((i) => i.id === id)) main = itemView(id);
  else if (view === 'new') main = newView();
  else if (view === 'blocks') main = blocksView();
  else if (view === 'settings') main = settingsView();
  else if (view === 'type' && findType(state, id)) main = typeView(id);
  else main = itemsView();

  const tab = (hash, icon, label, badge) =>
    h(
      'a',
      { href: hash, class: `tab ${location.hash.startsWith(hash) || (!location.hash && hash === '#/items') ? 'on' : ''}` },
      h('span', { class: 'ico' }, icon),
      label,
      badge ? h('span', { class: 'badge' }, badge) : null,
    );

  root.replaceChildren(
    h('main', null, main),
    h(
      'nav',
      { class: 'tabs' },
      tab('#/items', '📦', 'Items', pending || null),
      tab('#/new', '➕', 'New'),
      tab('#/blocks', '🧩', 'Blocks'),
      tab('#/settings', '⚙️', 'Settings'),
    ),
  );
}

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  render();
});

// ---- items list ---------------------------------------------------------------

function takedownCard() {
  const pending = pendingTakedowns(state);
  if (!pending.length) return null;
  return h(
    'section',
    { class: 'card alert' },
    h('h2', null, `🚨 Take down (${pending.length})`),
    h('p', { class: 'muted' }, 'Sold out elsewhere – delete these listings on the platform, then tick them off.'),
    pending.map(({ item, listing }) => {
      const acc = findAccount(state, listing.accountId);
      return h(
        'div',
        { class: 'row' },
        h(
          'div',
          { class: 'grow' },
          h('strong', null, acc ? acc.name : listing.accountId),
          h('div', { class: 'muted small' }, itemLabel(item)),
        ),
        listing.url ? h('a', { class: 'btn', href: listing.url, target: '_blank', rel: 'noopener' }, 'Open') : null,
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              setStatus(item, listing.accountId, 'removed');
              persist();
              render();
            },
          },
          'Done ✓',
        ),
      );
    }),
  );
}

function statusChips(item) {
  const live = item.listings.filter((l) => l.status !== 'removed');
  if (!live.length) return h('span', { class: 'muted small' }, 'not listed yet');
  return live.map((l) => {
    const acc = findAccount(state, l.accountId);
    return h('span', { class: `chip st-${l.status}` }, acc ? acc.name : '?');
  });
}

function itemsView() {
  const filters = { active: 'In stock', sold: 'Sold out', all: 'All' };
  const items = state.items
    .filter((i) => (ui.filter === 'all' ? true : ui.filter === 'sold' ? remaining(i) === 0 : remaining(i) > 0))
    .sort((a, b) => b.createdAt - a.createdAt);

  return h(
    'div',
    null,
    h('h1', null, 'Items'),
    takedownCard(),
    h(
      'div',
      { class: 'seg' },
      Object.entries(filters).map(([k, label]) =>
        h(
          'button',
          {
            class: ui.filter === k ? 'on' : '',
            onclick: () => {
              ui.filter = k;
              render();
            },
          },
          label,
        ),
      ),
    ),
    items.length
      ? items.map((item) =>
          h(
            'a',
            { class: 'card item', href: `#/item/${item.id}` },
            h('div', { class: 'row' }, h('strong', { class: 'grow' }, itemLabel(item)), h('span', { class: 'price' }, euro(item.price))),
            h(
              'div',
              { class: 'muted small' },
              `${findType(state, item.typeId)?.name || ''} · ${remaining(item)}/${Number(item.quantity) || 1} left`,
              item.photos ? ` · 📷 ${item.photos}` : '',
            ),
            h('div', { class: 'chips' }, statusChips(item)),
          ),
        )
      : h('p', { class: 'empty' }, ui.filter === 'active' ? 'Nothing in stock. Tap ➕ New to add an item.' : 'Nothing here.'),
  );
}

// ---- new item -----------------------------------------------------------------

function createItem(typeId) {
  const type = findType(state, typeId);
  const item = {
    id: uid(),
    typeId,
    values: { ...(type.defaults || {}) },
    blockToggles: {},
    extraText: '',
    photos: '',
    price: '',
    quantity: 1,
    sales: [],
    listings: [],
    createdAt: Date.now(),
  };
  state.items.push(item);
  persist();
  go(`#/item/${item.id}`);
}

function newView() {
  const recent = [...state.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  return h(
    'div',
    null,
    h('h1', null, 'New item'),
    h(
      'div',
      { class: 'grid' },
      state.productTypes.map((t) => h('button', { class: 'card big', onclick: () => createItem(t.id) }, t.name)),
    ),
    recent.length
      ? h(
          'section',
          null,
          h('h2', null, 'Same as before'),
          h('p', { class: 'muted small' }, 'Copies all details and texts – just adjust what differs.'),
          recent.map((item) =>
            h(
              'div',
              { class: 'row card' },
              h('div', { class: 'grow' }, itemLabel(item), h('div', { class: 'muted small' }, euro(item.price))),
              h('button', { class: 'btn', onclick: () => duplicate(item) }, 'Copy'),
            ),
          ),
        )
      : null,
  );
}

function duplicate(item) {
  const copyItem = duplicateItem(item);
  state.items.push(copyItem);
  persist();
  toast('Copied – this is the new item');
  go(`#/item/${copyItem.id}`);
}

// ---- item detail ----------------------------------------------------------------

function fieldInput(field, current, onValue) {
  const options = field.options || [];
  if (!options.length) {
    return h('input', { type: 'text', value: current || '', oninput: (e) => onValue(e.target.value, false), onchange: (e) => onValue(e.target.value, true) });
  }
  const opts = ['', ...options.filter((o) => o !== '')];
  if (current && !opts.includes(current)) opts.push(current);
  return h(
    'select',
    {
      value: current || '',
      onchange: (e) => {
        if (e.target.value === '__other') {
          const v = prompt(`${field.label}:`, current || '');
          if (v == null) {
            e.target.value = current || '';
            return;
          }
          onValue(v, true);
          render();
          return;
        }
        onValue(e.target.value, true);
      },
    },
    opts.map((o) => h('option', { value: o }, o || '—')),
    h('option', { value: '__other' }, 'Other…'),
  );
}

function itemView(id) {
  const item = state.items.find((i) => i.id === id);
  const type = findType(state, item.typeId);
  const titleEl = h('h1', null, itemLabel(item));
  const blocksEl = h('div');
  const listingsEl = h('div');
  const salesEl = h('div');

  const refresh = () => {
    titleEl.textContent = itemLabel(item);
    blocksEl.replaceChildren(blockToggles(item, type, refresh));
    listingsEl.replaceChildren(listingsSection(item, refresh));
    salesEl.replaceChildren(salesSection(item, refresh) || "");
  };

  const set = (mutate) => (value, final) => {
    mutate(value);
    persist();
    if (final) refresh();
  };

  const labeled = (label, input) => h('label', { class: 'field' }, h('span', null, label), input);

  const details = h(
    'section',
    { class: 'card' },
    h('h2', null, 'Details'),
    h(
      'div',
      { class: 'two' },
      labeled(
        'Price (€)',
        h('input', {
          type: 'number',
          inputmode: 'decimal',
          value: item.price,
          oninput: (e) => set((v) => (item.price = v))(e.target.value, false),
          onchange: (e) => set((v) => (item.price = v))(e.target.value, true),
        }),
      ),
      labeled(
        'Quantity',
        h('input', {
          type: 'number',
          inputmode: 'numeric',
          min: 1,
          value: item.quantity,
          onchange: (e) => set((v) => (item.quantity = Math.max(1, Number(v) || 1)))(e.target.value, true),
        }),
      ),
    ),
    type.fields.map((f) =>
      labeled(
        f.label,
        fieldInput(f, item.values[f.key], set((v) => (item.values[f.key] = v))),
      ),
    ),
    labeled(
      'Extra text (this item only)',
      h('textarea', {
        rows: 2,
        value: item.extraText,
        oninput: (e) => set((v) => (item.extraText = v))(e.target.value, false),
        onchange: (e) => set((v) => (item.extraText = v))(e.target.value, true),
      }),
    ),
    labeled(
      'Photos (note to self, e.g. “album Vita 64” or “new pics”)',
      h('input', { type: 'text', value: item.photos, onchange: (e) => set((v) => (item.photos = v))(e.target.value, false) }),
    ),
  );

  refresh();

  return h(
    'div',
    null,
    h('a', { href: '#/items', class: 'back' }, '‹ Items'),
    titleEl,
    h(
      'div',
      { class: 'row actions' },
      h('button', { class: 'btn', onclick: () => duplicate(item) }, '⧉ Same again'),
      h(
        'button',
        {
          class: 'btn danger',
          onclick: () => {
            if (!confirm('Delete this item and its listing history?')) return;
            state.items = state.items.filter((i) => i !== item);
            persist();
            go('#/items');
          },
        },
        'Delete',
      ),
    ),
    listingsEl,
    details,
    blocksEl,
    salesEl,
  );
}

function blockToggles(item, type, refresh) {
  const vars = itemVars(state, item);
  return h(
    'section',
    { class: 'card' },
    h('h2', null, 'Text blocks'),
    h('p', { class: 'muted small' }, 'Untick to leave a block out for this item. Greyed blocks are skipped automatically (a value is empty).'),
    type.blocks.map((entry) => {
      const block = state.blocks.find((b) => b.id === entry.blockId);
      if (!block) return null;
      const text = fill(block.text, vars);
      const on = isBlockOn(item, entry);
      return h(
        'label',
        { class: `blk ${text ? '' : 'skipped'}` },
        h('input', {
          type: 'checkbox',
          checked: on,
          onchange: (e) => {
            item.blockToggles = { ...item.blockToggles, [entry.blockId]: e.target.checked };
            persist();
            refresh();
          },
        }),
        h(
          'div',
          null,
          h('strong', null, block.name),
          block.platforms?.length ? h('span', { class: 'muted small' }, ` · only ${block.platforms.map(platformName).join(', ')}`) : null,
          h('div', { class: 'small preview' }, text || '(skipped – empty value)'),
        ),
      );
    }),
  );
}

function listingsSection(item, refresh) {
  const byPlatform = {};
  for (const acc of state.accounts) (byPlatform[acc.platform] ||= []).push(acc);
  return h(
    'section',
    { class: 'card' },
    h('h2', null, 'Listings'),
    h('p', { class: 'muted small' }, 'Tap an account to get the text for it, then mark it live once posted.'),
    Object.entries(byPlatform).map(([platform, accounts]) =>
      h(
        'div',
        { class: 'platform' },
        h('h3', null, platformName(platform)),
        accounts.map((acc) => accountRow(item, acc, refresh)),
      ),
    ),
  );
}

function accountRow(item, acc, refresh) {
  const listing = item.listings.find((l) => l.accountId === acc.id);
  const status = listing ? listing.status : null;
  const key = `${item.id}:${acc.id}`;
  const open = ui.expanded.has(key);
  const toggle = () => {
    open ? ui.expanded.delete(key) : ui.expanded.add(key);
    refresh();
  };
  return h(
    'div',
    { class: `acc ${open ? 'open' : ''}` },
    h(
      'button',
      { class: 'acc-head', onclick: toggle },
      h('span', { class: 'grow' }, acc.name),
      status ? h('span', { class: `chip st-${status}` }, STATUS[status]) : h('span', { class: 'muted small' }, '—'),
      h('span', { class: 'caret' }, open ? '▾' : '▸'),
    ),
    open ? accountPanel(item, acc, listing, refresh) : null,
  );
}

function accountPanel(item, acc, listing, refresh) {
  const out = generate(state, item, acc.id);
  const platform = state.platforms[acc.platform] || {};
  const status = listing ? listing.status : null;
  const act = (fn) => () => {
    fn();
    persist();
    render();
  };

  const actions = [];
  if (!status || status === 'draft' || status === 'removed') {
    actions.push(h('button', { class: 'btn primary', onclick: act(() => setStatus(item, acc.id, 'live')) }, '✅ Mark live'));
  }
  if (status === 'live') {
    actions.push(
      h(
        'button',
        {
          class: 'btn primary',
          onclick: act(() => {
            const down = recordSale(item, acc.id);
            if (down.length) toast(`Sold out – ${down.length} listing(s) to take down`);
            else toast(`Sale recorded – ${remaining(item)} left`);
          }),
        },
        `💰 Sold ${Number(item.quantity) > 1 ? '1' : ''}`.trim(),
      ),
      h('button', { class: 'btn', onclick: act(() => setStatus(item, acc.id, 'removed')) }, 'Removed'),
    );
  }
  if (status === 'takedown') {
    actions.push(h('button', { class: 'btn primary', onclick: act(() => setStatus(item, acc.id, 'removed')) }, 'Taken down ✓'));
  }

  return h(
    'div',
    { class: 'panel' },
    h(
      'div',
      { class: 'out' },
      h(
        'div',
        { class: 'row' },
        h('span', { class: 'label grow' }, 'Title'),
        h('span', { class: `small ${out.titleTooLong ? 'warn' : 'muted'}` }, out.titleMax ? `${out.title.length}/${out.titleMax}` : `${out.title.length}`),
        h('button', { class: 'btn sm', onclick: () => copy(out.title, 'Title copied') }, 'Copy'),
      ),
      h('div', { class: 'text' }, out.title),
    ),
    h(
      'div',
      { class: 'out' },
      h(
        'div',
        { class: 'row' },
        h('span', { class: 'label grow' }, 'Description'),
        h('button', { class: 'btn sm', onclick: () => copy(out.description, 'Description copied') }, 'Copy'),
      ),
      h('div', { class: 'text pre' }, out.description),
    ),
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'label grow' }, `Price: ${euro(out.price)}`),
      h('input', {
        class: 'sm-input',
        type: 'number',
        inputmode: 'decimal',
        placeholder: 'override',
        value: listing?.price ?? '',
        onchange: (e) => {
          ensureListing(item, acc.id).price = e.target.value === '' ? null : e.target.value;
          persist();
          refresh();
        },
      }),
      out.price != null ? h('button', { class: 'btn sm', onclick: () => copy(String(out.price), 'Price copied') }, 'Copy') : null,
    ),
    h(
      'div',
      { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => copy(`${out.title}\n\n${out.description}`, 'Title + description copied') }, 'Copy all'),
      platform.postUrl ? h('a', { class: 'btn', href: platform.postUrl, target: '_blank', rel: 'noopener' }, `Open ${platform.name} ↗`) : null,
    ),
    h(
      'label',
      { class: 'field' },
      h('span', null, 'Listing link (optional, handy for taking it down later)'),
      h('input', {
        type: 'url',
        value: listing?.url || '',
        placeholder: 'https://…',
        onchange: (e) => {
          ensureListing(item, acc.id).url = e.target.value.trim();
          persist();
        },
      }),
    ),
    h('div', { class: 'row wrap' }, actions),
    h(
      'label',
      { class: 'field inline' },
      h('span', { class: 'muted small' }, 'Set status manually'),
      h(
        'select',
        {
          value: status || '',
          onchange: (e) => {
            if (e.target.value) setStatus(item, acc.id, e.target.value);
            else item.listings = item.listings.filter((l) => l.accountId !== acc.id);
            persist();
            render();
          },
        },
        h('option', { value: '' }, '— not listed'),
        Object.entries(STATUS).map(([k, label]) => h('option', { value: k }, label)),
      ),
    ),
  );
}

function salesSection(item, refresh) {
  const n = soldCount(item);
  if (!n) return null;
  return h(
    'section',
    { class: 'card' },
    h('h2', null, 'Sales'),
    h('p', null, `${n} of ${Number(item.quantity) || 1} sold`),
    h(
      'ul',
      { class: 'small' },
      item.sales.map((s) => h('li', null, `${new Date(s.at).toLocaleDateString('de-DE')} – ${findAccount(state, s.accountId)?.name || s.accountId}`)),
    ),
    h(
      'button',
      {
        class: 'btn',
        onclick: () => {
          undoLastSale(item);
          persist();
          render();
        },
      },
      '↩︎ Undo last sale',
    ),
  );
}

// ---- blocks -----------------------------------------------------------------------

function platformChecks(selected, onChange) {
  return h(
    'div',
    { class: 'chips' },
    Object.keys(state.platforms).map((p) =>
      h(
        'label',
        { class: 'check' },
        h('input', {
          type: 'checkbox',
          checked: selected.includes(p),
          onchange: (e) => onChange(e.target.checked ? [...selected, p] : selected.filter((x) => x !== p)),
        }),
        platformName(p),
      ),
    ),
  );
}

function blocksView() {
  return h(
    'div',
    null,
    h('h1', null, 'Text blocks'),
    h(
      'details',
      { class: 'card help' },
      h('summary', null, 'How blocks work'),
      h('p', null, h('code', null, '{key}'), ' inserts a value from the item (e.g. ', h('code', null, '{sd_size}'), ', ', h('code', null, '{condition}'), ') or from Settings → Variables (e.g. ', h('code', null, '{city}'), ').'),
      h('p', null, 'If a value is empty, the whole block is left out.'),
      h('p', null, h('code', null, '[[ … ]]'), ' marks an optional part: only that part is dropped when its value is empty. Example: ', h('code', null, 'Versand[[ oder Abholung in {city}]].')),
      h('p', null, 'Platforms: tick none = used everywhere. Tick some = only on those.'),
      h('p', null, 'The order of blocks per product type is set in Settings → Product types.'),
    ),
    state.blocks.map((block) => {
      const usedBy = state.productTypes.filter((t) => t.blocks.some((e) => e.blockId === block.id));
      return h(
        'section',
        { class: 'card' },
        h('input', {
          class: 'title-input',
          value: block.name,
          onchange: (e) => {
            block.name = e.target.value;
            persist();
          },
        }),
        h('textarea', {
          rows: Math.min(8, Math.max(2, Math.ceil(block.text.length / 40))),
          value: block.text,
          onchange: (e) => {
            block.text = e.target.value;
            persist();
          },
        }),
        platformChecks(block.platforms || [], (next) => {
          block.platforms = next;
          persist();
          render();
        }),
        h(
          'div',
          { class: 'row' },
          h('span', { class: 'muted small grow' }, usedBy.length ? `Used in: ${usedBy.map((t) => t.name).join(', ')}` : 'Not used in any product type'),
          h(
            'button',
            {
              class: 'btn sm danger',
              onclick: () => {
                if (!confirm(`Delete block “${block.name}”?`)) return;
                state.blocks = state.blocks.filter((b) => b !== block);
                for (const t of state.productTypes) t.blocks = t.blocks.filter((e) => e.blockId !== block.id);
                persist();
                render();
              },
            },
            'Delete',
          ),
        ),
      );
    }),
    h(
      'button',
      {
        class: 'btn primary wide',
        onclick: () => {
          state.blocks.push({ id: uid(), name: 'New block', text: '', platforms: [] });
          persist();
          render();
          window.scrollTo(0, document.body.scrollHeight);
        },
      },
      '+ Add block',
    ),
  );
}

// ---- settings -----------------------------------------------------------------

function settingsView() {
  const platformKeys = Object.keys(state.platforms);
  const field = (label, input) => h('label', { class: 'field' }, h('span', null, label), input);
  const saveOn = (fn) => (e) => {
    fn(e.target.value);
    persist();
  };

  return h(
    'div',
    null,
    h('h1', null, 'Settings'),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Accounts'),
      state.accounts.map((acc) =>
        h(
          'div',
          { class: 'row' },
          h('input', { class: 'grow', value: acc.name, onchange: saveOn((v) => (acc.name = v)) }),
          h(
            'select',
            { value: acc.platform, onchange: saveOn((v) => (acc.platform = v)) },
            platformKeys.map((p) => h('option', { value: p }, platformName(p))),
          ),
          h(
            'button',
            {
              class: 'btn sm danger',
              onclick: () => {
                if (state.items.some((i) => i.listings.some((l) => l.accountId === acc.id && l.status !== 'removed'))) {
                  if (!confirm('This account has listings. Delete anyway?')) return;
                }
                state.accounts = state.accounts.filter((a) => a !== acc);
                persist();
                render();
              },
            },
            '✕',
          ),
        ),
      ),
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            state.accounts.push({ id: uid(), platform: 'kleinanzeigen', name: 'New account' });
            persist();
            render();
          },
        },
        '+ Add account',
      ),
    ),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Platforms'),
      platformKeys.map((p) => {
        const cfg = state.platforms[p];
        return h(
          'details',
          null,
          h('summary', null, cfg.name),
          field('“Post ad” link', h('input', { type: 'url', value: cfg.postUrl || '', onchange: saveOn((v) => (cfg.postUrl = v)) })),
          h(
            'div',
            { class: 'two' },
            field('Max title length', h('input', { type: 'number', value: cfg.titleMax ?? '', onchange: saveOn((v) => (cfg.titleMax = v ? Number(v) : null)) })),
            field('Price markup %', h('input', { type: 'number', value: cfg.markupPct ?? 0, onchange: saveOn((v) => (cfg.markupPct = Number(v) || 0)) })),
          ),
        );
      }),
    ),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Variables'),
      h('p', { class: 'muted small' }, 'Values usable in any block, e.g. {city}.'),
      Object.keys(state.globals).map((k) =>
        h(
          'div',
          { class: 'row' },
          h('code', null, `{${k}}`),
          h('input', { class: 'grow', value: state.globals[k], onchange: saveOn((v) => (state.globals[k] = v)) }),
          h(
            'button',
            {
              class: 'btn sm danger',
              onclick: () => {
                delete state.globals[k];
                persist();
                render();
              },
            },
            '✕',
          ),
        ),
      ),
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            const key = (prompt('Variable name (letters, digits, _):') || '').trim();
            if (!/^\w+$/.test(key)) return;
            state.globals[key] = '';
            persist();
            render();
          },
        },
        '+ Add variable',
      ),
    ),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Product types'),
      state.productTypes.map((t) => h('a', { class: 'row link', href: `#/type/${t.id}` }, h('span', { class: 'grow' }, t.name), '›')),
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            const t = {
              id: uid(),
              name: 'New product type',
              fields: [
                { key: 'condition', label: 'Condition', options: ['Neu', 'Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel', 'Defekt / für Bastler'] },
                { key: 'defects', label: 'Scratches / defects (empty = none)', options: [] },
              ],
              titles: { default: '' },
              blocks: ['extra', 'condition', 'defects', 'shipping', 'warranty-de', 'warranty-at']
                .filter((id) => state.blocks.some((b) => b.id === id))
                .map((blockId) => ({ blockId, on: true })),
              defaults: {},
            };
            state.productTypes.push(t);
            persist();
            go(`#/type/${t.id}`);
          },
        },
        '+ Add product type',
      ),
    ),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Backup & sync'),
      h('p', { class: 'muted small' }, 'Data lives only in this browser. Export regularly – and use export/import to move data between phone and computer.'),
      h(
        'div',
        { class: 'row wrap' },
        h('button', { class: 'btn primary', onclick: exportData }, '⬇ Export'),
        h(
          'label',
          { class: 'btn' },
          '⬆ Import',
          h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: importData }),
        ),
        h(
          'button',
          {
            class: 'btn danger',
            onclick: () => {
              if (!confirm('Reset EVERYTHING to the starter setup? Export first if unsure.')) return;
              state = defaultState();
              persist();
              go('#/items');
              render();
            },
          },
          'Reset',
        ),
      ),
    ),
  );
}

async function exportData() {
  const json = exportJson(state);
  const name = `ad-helper-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const next = migrate(JSON.parse(await file.text()));
    if (!confirm(`Replace current data with “${file.name}” (${next.items.length} items)?`)) return;
    state = next;
    persist();
    toast('Imported');
    go('#/items');
    render();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
}

// ---- product type editor -----------------------------------------------------------

function typeView(id) {
  const type = findType(state, id);
  const save_ = () => persist();
  const field = (label, input) => h('label', { class: 'field' }, h('span', null, label), input);
  const usedKeys = new Set(type.blocks.flatMap((e) => placeholders(state.blocks.find((b) => b.id === e.blockId)?.text || '')));

  return h(
    'div',
    null,
    h('a', { href: '#/settings', class: 'back' }, '‹ Settings'),
    h('h1', null, type.name),

    h(
      'section',
      { class: 'card' },
      field('Name', h('input', { value: type.name, onchange: (e) => ((type.name = e.target.value), save_()) })),
      field(
        'Title template',
        h('input', { value: type.titles.default || '', onchange: (e) => ((type.titles.default = e.target.value), save_()) }),
      ),
      h(
        'details',
        null,
        h('summary', { class: 'small' }, 'Different title per platform'),
        Object.keys(state.platforms).map((p) =>
          field(
            `${platformName(p)} (empty = use default)`,
            h('input', {
              value: type.titles[p] || '',
              onchange: (e) => {
                if (e.target.value) type.titles[p] = e.target.value;
                else delete type.titles[p];
                save_();
              },
            }),
          ),
        ),
      ),
    ),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Fields'),
      h('p', { class: 'muted small' }, 'Key = name used in blocks as {key}. Options comma-separated (empty = free text). Default = pre-filled for new items.'),
      type.fields.map((f, i) =>
        h(
          'div',
          { class: 'fieldrow' },
          h(
            'div',
            { class: 'two' },
            field('Key', h('input', { value: f.key, onchange: (e) => ((f.key = e.target.value.trim().replace(/\W/g, '_')), save_(), render()) })),
            field('Label', h('input', { value: f.label, onchange: (e) => ((f.label = e.target.value), save_()) })),
          ),
          field(
            'Options',
            h('input', {
              value: (f.options || []).join(', '),
              onchange: (e) => {
                f.options = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                save_();
              },
            }),
          ),
          h(
            'div',
            { class: 'row' },
            field(
              'Default',
              h('input', {
                value: type.defaults?.[f.key] || '',
                onchange: (e) => {
                  type.defaults = { ...type.defaults, [f.key]: e.target.value };
                  save_();
                },
              }),
            ),
            h('span', { class: 'grow' }),
            usedKeys.has(f.key) ? null : h('span', { class: 'muted small' }, 'not used in blocks'),
            h('button', { class: 'btn sm', disabled: i === 0, onclick: () => (move(type.fields, i, -1), save_(), render()) }, '↑'),
            h(
              'button',
              {
                class: 'btn sm danger',
                onclick: () => {
                  type.fields.splice(i, 1);
                  save_();
                  render();
                },
              },
              '✕',
            ),
          ),
        ),
      ),
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            type.fields.push({ key: `field_${type.fields.length + 1}`, label: 'New field', options: [] });
            save_();
            render();
          },
        },
        '+ Add field',
      ),
    ),

    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Blocks (in order)'),
      h('p', { class: 'muted small' }, 'Tick = on by default for new items. Can be switched per item.'),
      type.blocks.map((entry, i) => {
        const block = state.blocks.find((b) => b.id === entry.blockId);
        return h(
          'div',
          { class: 'row' },
          h('input', { type: 'checkbox', checked: entry.on !== false, onchange: (e) => ((entry.on = e.target.checked), save_()) }),
          h('span', { class: 'grow' }, block ? block.name : `(missing: ${entry.blockId})`),
          h('button', { class: 'btn sm', disabled: i === 0, onclick: () => (move(type.blocks, i, -1), save_(), render()) }, '↑'),
          h('button', { class: 'btn sm', disabled: i === type.blocks.length - 1, onclick: () => (move(type.blocks, i, 1), save_(), render()) }, '↓'),
          h('button', { class: 'btn sm danger', onclick: () => (type.blocks.splice(i, 1), save_(), render()) }, '✕'),
        );
      }),
      h(
        'select',
        {
          onchange: (e) => {
            if (!e.target.value) return;
            type.blocks.push({ blockId: e.target.value, on: true });
            save_();
            render();
          },
        },
        h('option', { value: '' }, '+ Add block…'),
        state.blocks.filter((b) => !type.blocks.some((e) => e.blockId === b.id)).map((b) => h('option', { value: b.id }, b.name)),
      ),
    ),

    h(
      'button',
      {
        class: 'btn danger wide',
        onclick: () => {
          if (state.items.some((i) => i.typeId === type.id)) {
            alert('Items of this type exist – delete them first.');
            return;
          }
          if (!confirm(`Delete product type “${type.name}”?`)) return;
          state.productTypes = state.productTypes.filter((t) => t !== type);
          persist();
          go('#/settings');
        },
      },
      'Delete product type',
    ),
  );
}

function move(arr, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

// ---- boot ---------------------------------------------------------------------------

requestPersistentStorage();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
