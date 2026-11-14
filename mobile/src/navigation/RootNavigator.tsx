import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ApartmentDetailsScreen } from '../features/buyer/screens/ApartmentDetailsScreen';
import { BookingsScreen } from '../features/buyer/screens/BookingsScreen';
import { CompareScreen } from '../features/buyer/screens/CompareScreen';
import { DeleteAccountScreen } from '../features/buyer/screens/DeleteAccountScreen';
import { LegalScreen } from '../features/buyer/screens/LegalScreen';
import { EmiCalculatorScreen } from '../features/buyer/screens/EmiCalculatorScreen';
import { FiltersScreen } from '../features/buyer/screens/FiltersScreen';
import { NotificationsScreen } from '../features/buyer/screens/NotificationsScreen';
import { PropertyDetailsScreen } from '../features/buyer/screens/PropertyDetailsScreen';
import { RecentlyViewedScreen } from '../features/buyer/screens/RecentlyViewedScreen';
import { ScheduleVisitScreen } from '../features/buyer/screens/ScheduleVisitScreen';
import { SettingsScreen } from '../features/buyer/screens/SettingsScreen';
import { SiteVisitScreen } from '../features/buyer/screens/SiteVisitScreen';
import { VirtualTourScreen } from '../features/buyer/screens/VirtualTourScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { VerifyOtpScreen } from '../features/auth/screens/VerifyOtpScreen';
import { ChatScreen } from '../features/chat/screens/ChatScreen';
import { AddPropertyScreen } from '../features/seller/screens/AddPropertyScreen';
import { PreviewListingScreen } from '../features/seller/screens/PreviewListingScreen';
import { PropertyPerformanceScreen } from '../features/seller/screens/PropertyPerformanceScreen';
import { PublishedScreen } from '../features/seller/screens/PublishedScreen';
import { SellerPropertyDetailsScreen } from '../features/seller/screens/SellerPropertyDetailsScreen';
import { SellerRegistrationScreen } from '../features/seller/screens/SellerRegistrationScreen';
import { SellerVerificationScreen } from '../features/seller/screens/SellerVerificationScreen';
import { BuyerTabs } from './BuyerTabs';
import { SellerTabs } from './SellerTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="BuyerTabs" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
        <Stack.Screen name="SellerTabs" component={SellerTabs} />

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />

        <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
        <Stack.Screen name="ApartmentDetails" component={ApartmentDetailsScreen} />
        <Stack.Screen name="ScheduleVisit" component={ScheduleVisitScreen} />
        <Stack.Screen name="SiteVisit" component={SiteVisitScreen} />
        <Stack.Screen name="VirtualTour" component={VirtualTourScreen} />
        <Stack.Screen name="Bookings" component={BookingsScreen} />
        <Stack.Screen name="Compare" component={CompareScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="RecentlyViewed" component={RecentlyViewedScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Filters" component={FiltersScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EmiCalculator" component={EmiCalculatorScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />

        <Stack.Screen name="SellerRegistration" component={SellerRegistrationScreen} />
        <Stack.Screen name="SellerVerification" component={SellerVerificationScreen} />
        <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
        <Stack.Screen name="PreviewListing" component={PreviewListingScreen} />
        <Stack.Screen name="Published" component={PublishedScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SellerPropertyDetails" component={SellerPropertyDetailsScreen} />
        <Stack.Screen name="PropertyPerformance" component={PropertyPerformanceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
