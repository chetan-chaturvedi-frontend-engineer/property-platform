import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/features/auth/AuthProvider';
import { UnreadNotificationsProvider } from './src/features/buyer/UnreadNotificationsProvider';
import { SavedPropertiesProvider } from './src/features/buyer/SavedPropertiesProvider';
import { PropertyFiltersProvider } from './src/features/buyer/PropertyFiltersProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <UnreadNotificationsProvider>
          <SavedPropertiesProvider>
            <PropertyFiltersProvider>
              <RootNavigator />
            </PropertyFiltersProvider>
          </SavedPropertiesProvider>
        </UnreadNotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
