import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Icon, PropertyPhoto, Screen, SectionTitle, StatTile, Tag } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { useMySubscription, useSellerEngagement, useSellerLeads, useSellerListings, useSiteVisitCount } from '../hooks/useSeller';

export function SellerDashboardScreen() {
  const nav = useRootNavigation();
  const { status, user } = useAuth();
  const listings = useSellerListings();
  const leads = useSellerLeads();
  const visits = useSiteVisitCount();
  const subscription = useMySubscription();
  const engagement = useSellerEngagement();
  const properties = listings.data ?? [];
  const active = properties.filter(p => p.status === 'Active').length;
  const signedIn = status === 'signedIn';
  const first = user?.fullName.split(' ')[0];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={typography.h1}>Welcome{first ? `,\n${first}!` : '!'}</Text>
        <Text style={typography.muted}>List your properties, reach genuine buyers and grow your business.</Text>
        <Button icon="add" label="Add New Property" style={styles.cta} onPress={() => nav.navigate(signedIn ? 'AddProperty' : 'Login')} />
      </View>

      {signedIn ? (
        <Card style={styles.verify}>
          <Icon name="ribbon-outline" size={26} />
          <View style={styles.flex}>
            <Text style={typography.h3}>{subscription.data ? `${subscription.data.planTitle} plan` : 'No active plan'}</Text>
            <Text style={typography.tiny}>
              {subscription.data
                ? subscription.data.propertyLimit === null ? 'Unlimited properties' : `Up to ${subscription.data.propertyLimit} properties`
                : 'Choose a plan to start listing properties.'}
            </Text>
          </View>
          <Button small variant="outline" label={subscription.data ? 'Plans' : 'Choose'} onPress={() => nav.navigate('SellerRegistration')} />
        </Card>
      ) : (
        <EmptyState title="Sign in to manage your listings" actionLabel="Sign In" onAction={() => nav.navigate('Login')} />
      )}

      {signedIn ? (
        <>
          <SectionTitle title="Overview" />
          <View style={styles.stats}>
            <StatTile icon="business-outline" value={String(properties.length)} label="Properties" trend={`${active} Active`} />
            <StatTile icon="eye-outline" value={String(engagement.data?.views ?? 0)} label="Views" trend={`${engagement.data?.uniqueViewers ?? 0} viewers`} />
            <StatTile icon="heart-outline" value={String(engagement.data?.saves ?? 0)} label="Saves" />
          </View>
          <View style={[styles.stats, styles.top]}>
            <StatTile icon="person-outline" value={String(leads.data?.length ?? 0)} label="Leads" />
            <StatTile icon="calendar-outline" value={String(visits.data ?? 0)} label="Site Visits" />
            <View style={styles.flex} />
          </View>

          <SectionTitle title="Recent Leads" />
          {(leads.data ?? []).slice(0, 3).map((l, i) => (
            <Card key={l.id} style={styles.inq}>
              <PropertyPhoto tone={i} style={styles.photo} icon="person" />
              <View style={styles.flex}><Text style={typography.h3}>{l.name}</Text><Text style={typography.muted} numberOfLines={1}>{l.message}</Text></View>
              {l.kind === 'New Lead' ? <Tag label="New" tone="primary" /> : null}
            </Card>
          ))}
          {!leads.loading && (leads.data ?? []).length === 0 ? <EmptyState title="No leads yet" body="New enquiries will appear here." /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { padding: 16, gap: 6, backgroundColor: colors.primaryTint },
  cta: { alignSelf: 'flex-start', marginTop: 8 },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  top: { marginTop: 8 },
  inq: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, padding: 10 },
  photo: { width: 48, height: 48 },
});
