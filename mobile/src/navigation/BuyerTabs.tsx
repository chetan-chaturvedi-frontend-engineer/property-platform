import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, IconName } from '../components';
import { ChatListScreen } from '../features/chat/screens/ChatListScreen';
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
  Chats: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  Saved: ['heart', 'heart-outline'],
  Profile: ['person', 'person-outline'],
};

const tabIcon =
  (name: keyof BuyerTabParamList) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) =>
    <Icon name={icons[name][focused ? 0 : 1]} size={size} color={color} />;

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
      <Tab.Screen name="Chats" component={ChatListScreen} options={{ tabBarBadge: 2 }} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
