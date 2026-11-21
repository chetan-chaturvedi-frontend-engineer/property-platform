import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ApartmentDetailsScreen } from '../features/buyer/screens/ApartmentDetailsScreen';
import { BookingsScreen } from '../features/buyer/screens/BookingsScreen';
import { CompareScreen } from '../features/buyer/screens/CompareScreen';
import { ChangePasswordScreen } from '../features/buyer/screens/ChangePasswordScreen';
import { EditProfileScreen } from '../features/buyer/screens/EditProfileScreen';
import { DeleteAccountScreen } from '../features/buyer/screens/DeleteAccountScreen';
import { LegalScreen } from '../features/buyer/screens/LegalScreen';
import { EmiCalculatorScreen } from '../features/buyer/screens/EmiCalculatorScreen';
import { FaqScreen } from '../features/buyer/screens/FaqScreen';
import { FiltersScreen } from '../features/buyer/screens/FiltersScreen';
import { NotificationsScreen } from '../features/buyer/screens/NotificationsScreen';
import { PropertyDetailsScreen } from '../features/buyer/screens/PropertyDetailsScreen';
import { RecentlyViewedScreen } from '../features/buyer/screens/RecentlyViewedScreen';
import { ScheduleVisitScreen } from '../features/buyer/screens/ScheduleVisitScreen';
import { SettingsScreen } from '../features/buyer/screens/SettingsScreen';
import { SiteVisitScreen } from '../features/buyer/screens/SiteVisitScreen';
import { VirtualTourScreen } from '../features/buyer/screens/VirtualTourScreen';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../features/auth/screens/ResetPasswordScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { VerifyOtpScreen } from '../features/auth/screens/VerifyOtpScreen';
import { ChatScreen } from '../features/chat/screens/ChatScreen';
import { AddPropertyScreen } from '../features/seller/screens/AddPropertyScreen';
import { PublishedScreen } from '../features/seller/screens/PublishedScreen';
import { SellerPropertyDetailsScreen } from '../features/seller/screens/SellerPropertyDetailsScreen';
import { SellerRegistrationScreen } from '../features/seller/screens/SellerRegistrationScreen';
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
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

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
        <Stack.Screen name="Faq" component={FaqScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />

        <Stack.Screen name="SellerRegistration" component={SellerRegistrationScreen} />
        <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
        <Stack.Screen name="Published" component={PublishedScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SellerPropertyDetails" component={SellerPropertyDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
