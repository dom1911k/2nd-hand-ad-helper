// Tiny template language for text blocks and titles.
//
//   {key}        → replaced by the variable's value
//   [[ ... ]]    → optional segment: dropped if any {key} inside it is empty
//
// A whole block is skipped (fill() returns null) when a {key} outside an
// optional segment is empty. That's how "SD card" blocks disappear for
// items without an SD card, the defects block disappears when there are none, etc.

const PLACEHOLDER = /\{(\w+)\}/g;
const OPTIONAL = /\[\[([\s\S]*?)\]\]/g;

function value(v) {
  return v == null ? '' : String(v).trim();
}

function hasAll(text, vars) {
  for (const m of text.matchAll(PLACEHOLDER)) {
    if (!value(vars[m[1]])) return false;
  }
  return true;
}

function substitute(text, vars) {
  return text.replace(PLACEHOLDER, (_, key) => value(vars[key]));
}

export function tidy(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?:;)])/g, '$1').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveOptional(text, vars) {
  return text.replace(OPTIONAL, (_, segment) => (hasAll(segment, vars) ? substitute(segment, vars) : ''));
}

/** Strict fill: returns null if a required placeholder is empty. */
export function fill(template, vars) {
  const withOptional = resolveOptional(template, vars);
  if (!hasAll(withOptional, vars)) return null;
  return tidy(substitute(withOptional, vars));
}

/** Lenient fill for titles: empty placeholders just become empty. */
export function fillLenient(template, vars) {
  return tidy(substitute(resolveOptional(template, vars), vars))
    .replace(/\s*[–-]\s*$/, '')
    .replace(/^\s*[–-]\s*/, '');
}

/** All placeholder keys used in a template (for UI hints). */
export function placeholders(template) {
  return [...new Set([...template.matchAll(PLACEHOLDER)].map((m) => m[1]))];
}
