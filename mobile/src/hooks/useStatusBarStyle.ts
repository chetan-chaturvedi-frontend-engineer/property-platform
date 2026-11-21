import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';

/** Sets the status bar text style while this screen is focused (light text on a dark header), then restores the default. */
export function useStatusBarStyle(style: StatusBarStyle) {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(style);
      return () => StatusBar.setBarStyle('dark-content');
    }, [style]),
  );
}
