import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, IconName } from '../components';
import { ChatListScreen } from '../features/chat/screens/ChatListScreen';
import { useUnreadMessages } from '../features/chat/UnreadMessagesProvider';
import { MyPropertiesScreen } from '../features/seller/screens/MyPropertiesScreen';
import { SellerAccountScreen } from '../features/seller/screens/SellerAccountScreen';
import { SellerDashboardScreen } from '../features/seller/screens/SellerDashboardScreen';
import { SellerLeadsScreen } from '../features/seller/screens/SellerLeadsScreen';
import { colors } from '../theme';
import { SellerTabParamList } from './types';

const Tab = createBottomTabNavigator<SellerTabParamList>();

const icons: Record<keyof SellerTabParamList, [IconName, IconName]> = {
  Dashboard: ['grid', 'grid-outline'],
  Properties: ['business', 'business-outline'],
  Leads: ['people', 'people-outline'],
  SellerChats: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  Account: ['person', 'person-outline'],
};

const tabIcon =
  (name: keyof SellerTabParamList) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) =>
    <Icon name={icons[name][focused ? 0 : 1]} size={size} color={color} />;

export function SellerTabs() {
  const { unread } = useUnreadMessages();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: tabIcon(route.name),
      })}>
      <Tab.Screen name="Dashboard" component={SellerDashboardScreen} />
      <Tab.Screen name="Properties" component={MyPropertiesScreen} />
      <Tab.Screen name="Leads" component={SellerLeadsScreen} />
      <Tab.Screen name="SellerChats" component={ChatListScreen} options={{ title: 'Chats', tabBarBadge: unread || undefined }} />
      <Tab.Screen name="Account" component={SellerAccountScreen} />
    </Tab.Navigator>
  );
}
