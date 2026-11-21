import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/features/auth/AuthProvider';
import { UnreadMessagesProvider } from './src/features/chat/UnreadMessagesProvider';
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
          <UnreadMessagesProvider>
            <SavedPropertiesProvider>
              <PropertyFiltersProvider>
                <RootNavigator />
              </PropertyFiltersProvider>
            </SavedPropertiesProvider>
          </UnreadMessagesProvider>
        </UnreadNotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
