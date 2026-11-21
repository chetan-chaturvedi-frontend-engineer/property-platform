import type { PermissionAction, PermissionModule, RolePermissions } from '../types/role.types';

/** Granted permission codes (e.g. `LEAD_LIST_ANY`), the matrix's working state. */
export type PermissionSelection = ReadonlySet<string>;

export type ModuleSelectionState = 'all' | 'some' | 'none';

/**
 * An action shared by at least this share of modules (and by 2 or more) gets its own matrix column; the
 * rest show when a row is expanded.
 */
const COLUMN_MIN_SHARE = 1 / 3;

/**
 * Matrix columns, derived from the catalog: actions most modules share (list, view, create, update,
 * delete today), ordered by their usual position within a module. New actions need no client change.
 */
export function matrixColumns(catalog: readonly PermissionModule[]): string[] {
  const stats = new Map<string, { modules: number; positionSum: number }>();
  for (const module of catalog) {
    module.actions.forEach((action, index) => {
      const entry = stats.get(action.key) ?? { modules: 0, positionSum: 0 };
      stats.set(action.key, { modules: entry.modules + 1, positionSum: entry.positionSum + index });
    });
  }
  return [...stats.entries()]
    .filter(
      ([, entry]) => entry.modules >= Math.max(2, Math.ceil(catalog.length * COLUMN_MIN_SHARE)),
    )
    .sort(([, a], [, b]) => a.positionSum / a.modules - b.positionSum / b.modules)
    .map(([key]) => key);
}

/** Actions of a module that have no column of their own. */
export function extraActions(
  module: PermissionModule,
  columns: readonly string[],
): PermissionAction[] {
  return module.actions.filter((action) => !columns.includes(action.key));
}

/** The catalog codes a role grants. Keys outside the catalog are ignored (the backend rejects them). */
export function selectionFromPermissions(
  permissions: RolePermissions,
  catalog: readonly PermissionModule[],
): Set<string> {
  const selected = new Set<string>();
  for (const module of catalog) {
    const granted = permissions[module.key];
    if (!granted) continue;
    for (const action of module.actions) {
      if (granted[action.key] === true) selected.add(action.code);
    }
  }
  return selected;
}

/** Request body for `permissions`: only granted actions, grouped by module (anything missing is denied). */
export function permissionsFromSelection(
  selection: PermissionSelection,
  catalog: readonly PermissionModule[],
): RolePermissions {
  const permissions: RolePermissions = {};
  for (const module of catalog) {
    const granted = module.actions.filter((action) => selection.has(action.code));
    if (granted.length > 0) {
      permissions[module.key] = Object.fromEntries(granted.map((action) => [action.key, true]));
    }
  }
  return permissions;
}

export function moduleState(
  module: PermissionModule,
  selection: PermissionSelection,
): ModuleSelectionState {
  const granted = module.actions.filter((action) => selection.has(action.code)).length;
  if (granted === 0) return 'none';
  return granted === module.actions.length ? 'all' : 'some';
}

/** Toggles one code. */
export function toggleCode(
  selection: PermissionSelection,
  code: string,
  granted: boolean,
): Set<string> {
  const next = new Set(selection);
  if (granted) next.add(code);
  else next.delete(code);
  return next;
}

/**
 * Grants or revokes many codes at once (a module, or every visible module), skipping codes the caller
 * may not change, so a bulk action never touches permissions outside their own.
 */
export function setCodes(
  selection: PermissionSelection,
  codes: readonly string[],
  granted: boolean,
  isChangeable: (code: string) => boolean,
): Set<string> {
  const next = new Set(selection);
  for (const code of codes) {
    if (!isChangeable(code)) continue;
    if (granted) next.add(code);
    else next.delete(code);
  }
  return next;
}

export const moduleCodes = (module: PermissionModule) =>
  module.actions.map((action) => action.code);

export function sameSelection(a: PermissionSelection, b: PermissionSelection): boolean {
  return a.size === b.size && [...a].every((code) => b.has(code));
}

/** Codes granted in `next` but not `base` (added) and the reverse (removed). */
export function selectionChanges(base: PermissionSelection, next: PermissionSelection) {
  return {
    added: [...next].filter((code) => !base.has(code)),
    removed: [...base].filter((code) => !next.has(code)),
  };
}

/** `list_any` → "List (all)", `update_status` → "Update status". */
export function actionLabel(key: string): string {
  const scopedToAll = key.endsWith('_any');
  const words = (scopedToAll ? key.slice(0, -4) : key).replace(/_/g, ' ');
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return scopedToAll ? `${label} (all)` : label;
}

/**
 * Modules matching a search, by module label or key, action label or key, or permission code.
 * `matchedActions` holds the codes that matched by action (to expand those rows); empty when the
 * module itself matched or there is no query.
 */
export function filterModules(
  catalog: readonly PermissionModule[],
  query: string,
): { module: PermissionModule; matchedActions: string[] }[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return catalog.map((module) => ({ module, matchedActions: [] }));
  const results: { module: PermissionModule; matchedActions: string[] }[] = [];
  for (const module of catalog) {
    if (
      module.label.toLowerCase().includes(needle) ||
      module.key.includes(needle.replace(/\s+/g, '_'))
    ) {
      results.push({ module, matchedActions: [] });
      continue;
    }
    const matched = module.actions
      .filter(
        (action) =>
          actionLabel(action.key).toLowerCase().includes(needle) ||
          action.key.includes(needle.replace(/\s+/g, '_')) ||
          action.code.toLowerCase().includes(needle),
      )
      .map((action) => action.code);
    if (matched.length > 0) results.push({ module, matchedActions: matched });
  }
  return results;
}
