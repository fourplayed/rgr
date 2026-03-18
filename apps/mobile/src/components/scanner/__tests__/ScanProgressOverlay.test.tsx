import React from 'react';
import { render, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { ScanProgressOverlay } from '../ScanProgressOverlay';

jest.mock('expo-haptics');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.useFakeTimers();

describe('ScanProgressOverlay', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('shows "Acquiring location..." during first 5s of location step', () => {
    const { getByText } = render(<ScanProgressOverlay step="location" />);
    expect(getByText('Acquiring location...')).toBeTruthy();
  });

  it('cycles to "Getting precise fix..." after 5s', () => {
    const { getByText, queryByText } = render(<ScanProgressOverlay step="location" />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(getByText('Getting precise fix...')).toBeTruthy();
    expect(queryByText('Acquiring location...')).toBeNull();
  });

  it('cycles to "Trying alternative signal..." after 10s', () => {
    const { getByText } = render(<ScanProgressOverlay step="location" />);
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(getByText('Trying alternative signal...')).toBeTruthy();
  });

  it('cycles to "Almost there..." after 18s', () => {
    const { getByText } = render(<ScanProgressOverlay step="location" />);
    act(() => {
      jest.advanceTimersByTime(18000);
    });
    expect(getByText('Almost there...')).toBeTruthy();
  });

  it('does not show sub-text for non-location steps', () => {
    const { queryByText } = render(<ScanProgressOverlay step="detected" />);
    expect(queryByText('Acquiring location...')).toBeNull();
  });

  it('resets timer when step changes away from location', () => {
    const { rerender, queryByText, getByText } = render(<ScanProgressOverlay step="location" />);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(getByText('Getting precise fix...')).toBeTruthy();

    rerender(<ScanProgressOverlay step="lookup" />);
    expect(queryByText('Getting precise fix...')).toBeNull();
  });

  it('triggers haptic feedback on location → lookup transition', () => {
    const { rerender } = render(<ScanProgressOverlay step="location" />);
    rerender(<ScanProgressOverlay step="lookup" />);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('does not trigger haptic for other transitions', () => {
    const { rerender } = render(<ScanProgressOverlay step="detected" />);
    rerender(<ScanProgressOverlay step="location" />);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});
