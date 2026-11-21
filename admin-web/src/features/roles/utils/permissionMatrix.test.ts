import { MOCK_PERMISSION_CATALOG } from '@/tests/mocks/roleMockData';

import type { PermissionModule } from '../types/role.types';

import {
  actionLabel,
  extraActions,
  filterModules,
  matrixColumns,
  moduleState,
  permissionsFromSelection,
  sameSelection,
  selectionChanges,
  selectionFromPermissions,
  setCodes,
  toggleCode,
} from './permissionMatrix';

const catalog = MOCK_PERMISSION_CATALOG;
const faq = catalog.find((module) => module.key === 'faq') as PermissionModule;

describe('permission matrix helpers', () => {
  it('derives the shared action columns from the catalog in their usual order', () => {
    expect(matrixColumns(catalog)).toEqual(['list', 'view', 'create', 'update', 'delete']);
    expect(matrixColumns([])).toEqual([]);
    expect(extraActions(faq, matrixColumns(catalog)).map((action) => action.key)).toEqual([
      'publish',
    ]);
  });

  it('converts between role permissions and selected codes, ignoring unknown keys', () => {
    const selection = selectionFromPermissions(
      { faq: { view: true, publish: false }, lead: { list_any: true }, secret: { read: true } },
      catalog,
    );
    expect([...selection].sort()).toEqual(['FAQ_VIEW', 'LEAD_LIST_ANY']);
    expect(permissionsFromSelection(selection, catalog)).toEqual({
      lead: { list_any: true },
      faq: { view: true },
    });
    expect(permissionsFromSelection(new Set(), catalog)).toEqual({});
  });

  it('reports the module state for the parent checkbox', () => {
    expect(moduleState(faq, new Set())).toBe('none');
    expect(moduleState(faq, new Set(['FAQ_VIEW']))).toBe('some');
    expect(moduleState(faq, new Set(faq.actions.map((action) => action.code)))).toBe('all');
  });

  it('bulk changes skip codes that cannot be changed', () => {
    const start = new Set(['FAQ_DELETE']);
    const granted = setCodes(
      start,
      ['FAQ_VIEW', 'FAQ_PUBLISH'],
      true,
      (code) => code !== 'FAQ_PUBLISH',
    );
    expect([...granted].sort()).toEqual(['FAQ_DELETE', 'FAQ_VIEW']);
    const cleared = setCodes(
      granted,
      ['FAQ_VIEW', 'FAQ_DELETE'],
      false,
      (code) => code !== 'FAQ_DELETE',
    );
    expect([...cleared]).toEqual(['FAQ_DELETE']);
    expect([...toggleCode(start, 'FAQ_DELETE', false)]).toEqual([]);
  });

  it('compares selections and lists the changes', () => {
    const base = new Set(['A', 'B']);
    expect(sameSelection(base, new Set(['B', 'A']))).toBe(true);
    expect(sameSelection(base, new Set(['A']))).toBe(false);
    expect(selectionChanges(base, new Set(['B', 'C']))).toEqual({ added: ['C'], removed: ['A'] });
  });

  it('labels actions, marking admin-wide ones', () => {
    expect(actionLabel('view')).toBe('View');
    expect(actionLabel('change_status')).toBe('Change status');
    expect(actionLabel('update_status_any')).toBe('Update status (all)');
  });

  it('filters modules by name, action or code and reports which actions matched', () => {
    expect(filterModules(catalog, '').length).toBe(catalog.length);
    expect(filterModules(catalog, 'site vis').map((entry) => entry.module.key)).toEqual([
      'site_visit',
    ]);
    const publish = filterModules(catalog, 'publish');
    expect(publish.map((entry) => entry.module.key)).toEqual(['property', 'faq', 'page']);
    expect(publish[1]?.matchedActions).toEqual(['FAQ_PUBLISH']);
    expect(filterModules(catalog, 'LEAD_ASSIGN')[0]?.matchedActions).toEqual(['LEAD_ASSIGN']);
    expect(filterModules(catalog, 'zzz')).toEqual([]);
  });
});
