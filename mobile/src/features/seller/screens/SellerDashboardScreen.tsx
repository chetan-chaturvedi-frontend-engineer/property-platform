import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, PropertyPhoto, QuickActionTile, Screen, SectionTitle, Tag } from '../../../components';
import { useStatusBarStyle } from '../../../hooks/useStatusBarStyle';
import { SellerTabParamList } from '../../../navigation/types';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { useUnreadNotifications } from '../../buyer/UnreadNotificationsProvider';
import { useUnreadMessages } from '../../chat/UnreadMessagesProvider';
import { DashboardHero } from '../components/DashboardHero';
import { MiniListingCard } from '../components/MiniListingCard';
import { StatStrip } from '../components/StatStrip';
import { useMySubscription, useSellerEngagement, useSellerLeads, useSellerListings, useSiteVisitCount } from '../hooks/useSeller';

const RECENT_LEADS = 3;
const LISTING_STRIP = 8;

export function SellerDashboardScreen() {
  const nav = useRootNavigation();
  const tabs = useNavigation<BottomTabNavigationProp<SellerTabParamList>>();
  const { status, user } = useAuth();
  const { unread: unreadNotifications } = useUnreadNotifications();
  const { unread: unreadMessages } = useUnreadMessages();
  const listings = useSellerListings();
  const leads = useSellerLeads();
  const visits = useSiteVisitCount();
  const subscription = useMySubscription();
  const engagement = useSellerEngagement();
  useStatusBarStyle('light-content');

  const signedIn = status === 'signedIn';
  const properties = listings.data ?? [];
  const plan = subscription.data;
  const planLabel = plan
    ? `${plan.planTitle} · ${plan.propertyLimit === null ? 'Unlimited' : `Up to ${plan.propertyLimit}`} ${plan.propertyLimit === 1 ? 'property' : 'properties'}`
    : signedIn ? 'Choose a plan' : undefined;

  return (
    <Screen edges={[]}>
      <DashboardHero
        firstName={user?.fullName.split(' ')[0]}
        planLabel={planLabel}
        unreadNotifications={unreadNotifications}
        onAddProperty={() => nav.navigate(signedIn ? 'AddProperty' : 'Login')}
        onNotifications={() => nav.navigate('Notifications')}
        onPlans={() => nav.navigate('SellerRegistration')}
      />

      {!signedIn ? (
        <View style={styles.guest}>
          <EmptyState title="Sign in to manage your listings" body="Track views, leads and site visits for your properties." actionLabel="Sign In" onAction={() => nav.navigate('Login')} />
        </View>
      ) : (
        <>
          <StatStrip
            stats={[
              { icon: 'business-outline', value: String(properties.length), label: 'Properties' },
              { icon: 'eye-outline', value: String(engagement.data?.views ?? 0), label: 'Views' },
              { icon: 'heart-outline', value: String(engagement.data?.saves ?? 0), label: 'Saves' },
              { icon: 'calendar-outline', value: String(visits.data ?? 0), label: 'Visits' },
            ]}
          />

          <View style={styles.tiles}>
            <QuickActionTile icon="add-circle-outline" label="Add Property" onPress={() => nav.navigate('AddProperty')} />
            <QuickActionTile icon="business-outline" label="My Properties" onPress={() => tabs.navigate('Properties')} />
            <QuickActionTile icon="people-outline" label="Leads" onPress={() => tabs.navigate('Leads')} />
            <QuickActionTile icon="chatbubble-ellipses-outline" label="Messages" badge={unreadMessages} onPress={() => tabs.navigate('SellerChats')} />
          </View>

          <SectionTitle title="My Properties" action={properties.length > 0 ? 'View All' : undefined} onAction={() => tabs.navigate('Properties')} />
          {properties.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {properties.slice(0, LISTING_STRIP).map((p, i) => (
                <MiniListingCard key={p.id} listing={p} tone={i} onPress={() => nav.navigate('SellerPropertyDetails', { id: p.id })} />
              ))}
            </ScrollView>
          ) : !listings.loading ? (
            <EmptyState title="No properties yet" body="List your first property to start receiving enquiries." actionLabel="Add Property" onAction={() => nav.navigate('AddProperty')} />
          ) : null}

          <SectionTitle title="Recent Leads" action={(leads.data ?? []).length > 0 ? 'View All' : undefined} onAction={() => tabs.navigate('Leads')} />
          {(leads.data ?? []).slice(0, RECENT_LEADS).map((l, i) => (
            <Card key={l.id} style={styles.lead}>
              <PropertyPhoto tone={i} style={styles.avatar} icon="person" />
              <View style={styles.flex}>
                <Text style={typography.h3}>{l.name}</Text>
                <Text style={typography.muted} numberOfLines={1}>{l.message}</Text>
              </View>
              {l.kind === 'New Lead' ? <Tag label="New" tone="primary" /> : null}
            </Card>
          ))}
          {!leads.loading && (leads.data ?? []).length === 0 ? <EmptyState title="No leads yet" body="New enquiries will appear here." /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  guest: { marginTop: 8 },
  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 20 },
  strip: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, padding: 10, backgroundColor: colors.background },
  avatar: { width: 44, height: 44, borderRadius: 22 },
});
