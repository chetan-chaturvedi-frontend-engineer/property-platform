import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../src/components/Button';

test('Button renders its label and fires onPress', async () => {
  const onPress = jest.fn();
  await render(<Button label="Confirm Visit" onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Visit' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
