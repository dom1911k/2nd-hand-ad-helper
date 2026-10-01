// Pure functions: listing generation and the sold → take-down flow.
import { fill, fillLenient } from './template.js';

export const STATUS = {
  draft: 'Planned',
  live: 'Live',
  takedown: 'Take down!',
  removed: 'Removed',
  sold: 'Sold here',
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function findType(state, typeId) {
  return state.productTypes.find((t) => t.id === typeId);
}

export function findAccount(state, accountId) {
  return state.accounts.find((a) => a.id === accountId);
}

export function itemVars(state, item) {
  return {
    ...state.globals,
    ...item.values,
    extra: item.extraText || '',
    price: item.price != null && item.price !== '' ? String(item.price) : '',
    quantity: String(remaining(item)),
  };
}

export function isBlockOn(item, entry) {
  const override = item.blockToggles?.[entry.blockId];
  return override == null ? entry.on !== false : override;
}

export function blockAppliesTo(block, platform) {
  return !block.platforms || block.platforms.length === 0 || block.platforms.includes(platform);
}

export function buildTitle(state, item, platform) {
  const type = findType(state, item.typeId);
  if (!type) return '';
  const template = (type.titles && (type.titles[platform] || type.titles.default)) || type.name;
  return fillLenient(template, itemVars(state, item));
}

export function buildDescription(state, item, platform) {
  const type = findType(state, item.typeId);
  if (!type) return '';
  const vars = itemVars(state, item);
  const parts = [];
  for (const entry of type.blocks) {
    if (!isBlockOn(item, entry)) continue;
    const block = state.blocks.find((b) => b.id === entry.blockId);
    if (!block || !blockAppliesTo(block, platform)) continue;
    const text = fill(block.text, vars);
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

export function listingPrice(state, item, listing, platform) {
  if (listing && listing.price != null && listing.price !== '') return Number(listing.price);
  const base = Number(item.price);
  if (!base) return null;
  const markup = Number(state.platforms[platform]?.markupPct) || 0;
  return Math.round(base * (1 + markup / 100));
}

export function generate(state, item, accountId) {
  const account = findAccount(state, accountId);
  const platform = account.platform;
  const listing = item.listings.find((l) => l.accountId === accountId);
  const title = buildTitle(state, item, platform);
  const titleMax = state.platforms[platform]?.titleMax || null;
  return {
    title,
    titleMax,
    titleTooLong: titleMax ? title.length > titleMax : false,
    description: buildDescription(state, item, platform),
    price: listingPrice(state, item, listing, platform),
  };
}

// ---- quantity & sales -------------------------------------------------------

export function soldCount(item) {
  return (item.sales || []).length;
}

export function remaining(item) {
  return Math.max(0, (Number(item.quantity) || 1) - soldCount(item));
}

export function ensureListing(item, accountId) {
  let listing = item.listings.find((l) => l.accountId === accountId);
  if (!listing) {
    listing = { id: uid(), accountId, status: 'draft', url: '', price: null, updatedAt: Date.now() };
    item.listings.push(listing);
  }
  return listing;
}

export function setStatus(item, accountId, status) {
  const listing = ensureListing(item, accountId);
  listing.status = status;
  listing.updatedAt = Date.now();
  return listing;
}

/**
 * Record one unit sold via the given account.
 * While stock remains, listings stay as they are. When the last unit is gone,
 * the selling listing becomes "sold", every other live listing becomes
 * "takedown" (you must delete it on the platform), and planned ones are dropped.
 */
export function recordSale(item, accountId) {
  const listing = ensureListing(item, accountId);
  item.sales = item.sales || [];
  item.sales.push({ accountId, at: Date.now() });
  if (remaining(item) > 0) return [];
  const toTakeDown = [];
  for (const l of item.listings) {
    if (l === listing) {
      l.status = 'sold';
    } else if (l.status === 'live') {
      l.status = 'takedown';
      toTakeDown.push(l);
    } else if (l.status === 'draft') {
      l.status = 'removed';
    }
    l.updatedAt = Date.now();
  }
  return toTakeDown;
}

/** Undo the most recent sale; listings that were flagged for take-down go back to live. */
export function undoLastSale(item) {
  const sale = (item.sales || []).pop();
  if (!sale) return;
  for (const l of item.listings) {
    if (l.status === 'takedown') l.status = 'live';
    if (l.status === 'sold' && l.accountId === sale.accountId) l.status = 'live';
    l.updatedAt = Date.now();
  }
}

/** All listings across all items that still need to be deleted on a platform. */
export function pendingTakedowns(state) {
  const out = [];
  for (const item of state.items) {
    for (const listing of item.listings) {
      if (listing.status === 'takedown') out.push({ item, listing });
    }
  }
  return out;
}

export function duplicateItem(item) {
  return {
    ...structuredClone(item),
    id: uid(),
    createdAt: Date.now(),
    sales: [],
    listings: [],
  };
}
