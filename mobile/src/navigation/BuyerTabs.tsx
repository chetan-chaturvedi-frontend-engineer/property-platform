import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, IconName } from '../components';
import { BookingsScreen } from '../features/buyer/screens/BookingsScreen';
import { HomeScreen } from '../features/buyer/screens/HomeScreen';
import { MapSearchScreen } from '../features/buyer/screens/MapSearchScreen';
import { ProfileScreen } from '../features/buyer/screens/ProfileScreen';
import { SavedScreen } from '../features/buyer/screens/SavedScreen';
import { colors } from '../theme';
import { BuyerTabParamList } from './types';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

const icons: Record<keyof BuyerTabParamList, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Saved: ['heart', 'heart-outline'],
  SiteVisits: ['calendar', 'calendar-outline'],
  Profile: ['person', 'person-outline'],
};

const tabIcon =
  (name: keyof BuyerTabParamList) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) =>
    <Icon name={icons[name][focused ? 0 : 1]} size={size} color={color} />;

const SiteVisitsTab = () => <BookingsScreen showBack={false} />;

export function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: tabIcon(route.name),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={MapSearchScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="SiteVisits" component={SiteVisitsTab} options={{ title: 'Site Visits' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
