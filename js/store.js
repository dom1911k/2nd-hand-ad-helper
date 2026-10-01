// Persistence: localStorage on this device, plus JSON export/import for backups
// and moving data between phone and computer.
import { defaultState } from './defaults.js';

const KEY = 'ad-helper.state.v1';

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not load saved data', err);
  }
  return defaultState();
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Could not save', err);
    return false;
  }
}

export function migrate(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
    throw new Error('Not an Ad Helper backup file');
  }
  const base = defaultState();
  return {
    ...base,
    ...data,
    globals: { ...base.globals, ...data.globals },
    platforms: { ...base.platforms, ...data.platforms },
  };
}

export function exportJson(state) {
  return JSON.stringify(state, null, 2);
}

export function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}
