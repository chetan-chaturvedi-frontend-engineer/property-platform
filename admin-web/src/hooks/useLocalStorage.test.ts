import { act, renderHook } from '@testing-library/react';

import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  it('starts from the default and persists updates as JSON', () => {
    const { result } = renderHook(() => useLocalStorage('page-size', 20));
    expect(result.current[0]).toBe(20);

    act(() => result.current[1](50));

    expect(result.current[0]).toBe(50);
    expect(window.localStorage.getItem('page-size')).toBe('50');
  });

  it('reads an existing value and ignores corrupt data', () => {
    window.localStorage.setItem('good', '"dark"');
    window.localStorage.setItem('bad', '{not json');

    expect(renderHook(() => useLocalStorage('good', 'light')).result.current[0]).toBe('dark');
    expect(renderHook(() => useLocalStorage('bad', 'fallback')).result.current[0]).toBe('fallback');
  });
});
