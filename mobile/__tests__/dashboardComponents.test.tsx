import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MiniListingCard } from '../src/features/seller/components/MiniListingCard';
import { QuickActionTile } from '../src/features/seller/components/QuickActionTile';
import { StatStrip } from '../src/features/seller/components/StatStrip';

describe('StatStrip', () => {
  it('shows every number with its label for screen readers', async () => {
    await render(
      <StatStrip
        stats={[
          { icon: 'business-outline', value: '3', label: 'Properties' },
          { icon: 'eye-outline', value: '120', label: 'Views' },
        ]}
      />,
    );
    expect(screen.getByLabelText('3 Properties')).toBeTruthy();
    expect(screen.getByLabelText('120 Views')).toBeTruthy();
  });
});

describe('QuickActionTile', () => {
  it('calls back on press and caps the badge at 9+', async () => {
    const onPress = jest.fn();
    await render(<QuickActionTile icon="people-outline" label="Messages" badge={12} onPress={onPress} />);
    expect(screen.getByText('9+')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Messages'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows no badge when there is nothing unread', async () => {
    await render(<QuickActionTile icon="people-outline" label="Messages" badge={0} onPress={jest.fn()} />);
    expect(screen.queryByText('0')).toBeNull();
  });
});

describe('MiniListingCard', () => {
  const listing = { id: '7', title: 'Sunrise Villas', area: 'Madhapur, Hyderabad', price: '', sqft: '', purpose: 'For Sale' as const, status: 'Under Review' as const };

  it('shows the title, area and status and opens on press', async () => {
    const onPress = jest.fn();
    await render(<MiniListingCard listing={listing} tone={1} onPress={onPress} />);
    expect(screen.getByText('Sunrise Villas')).toBeTruthy();
    expect(screen.getByText('Madhapur, Hyderabad')).toBeTruthy();
    expect(screen.getByText('Under Review')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Open Sunrise Villas'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
