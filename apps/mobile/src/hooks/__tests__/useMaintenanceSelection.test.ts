import { renderHook, act } from '@testing-library/react-native';
import { useMaintenanceSelection } from '../useMaintenanceSelection';

describe('useMaintenanceSelection', () => {
  const completableItems = [
    { id: '1', status: 'scheduled' },
    { id: '2', status: 'in_progress' },
    { id: '3', status: 'completed' },
    { id: '4', status: 'scheduled' },
  ] as any[];

  it('starts in non-selection mode', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.selectedIds).toEqual(new Set());
  });

  it('enters selection mode on enterSelection', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    expect(result.current.isSelecting).toBe(true);
    expect(result.current.selectedIds.has('1')).toBe(true);
  });

  it('toggles item selection', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.toggleItem('2'));
    expect(result.current.selectedIds).toEqual(new Set(['1', '2']));
    act(() => result.current.toggleItem('1'));
    expect(result.current.selectedIds).toEqual(new Set(['2']));
  });

  it('only allows selecting scheduled/in_progress items', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.toggleItem('3')); // completed — should not add
    expect(result.current.selectedIds.has('3')).toBe(false);
  });

  it('selectAll only selects completable items', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.selectAll());
    expect(result.current.selectedIds).toEqual(new Set(['1', '2', '4']));
  });

  it('exitSelection clears state', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.exitSelection());
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.selectedIds).toEqual(new Set());
  });

  it('isCompletable returns true for scheduled/in_progress', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    expect(result.current.isCompletable('1')).toBe(true);
    expect(result.current.isCompletable('3')).toBe(false);
  });
});
