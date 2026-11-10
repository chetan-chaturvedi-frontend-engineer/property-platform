import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Header, Icon, IconButton, ListRow, Screen, SectionTitle, Tag } from '../../../components';
import type { IconName } from '../../../components';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { colors, typography } from '../../../theme';

const rows: { icon: IconName; title: string }[] = [
  { icon: 'heart-outline', title: 'Saved Properties' },
  { icon: 'people-outline', title: 'My Leads' },
  { icon: 'chatbubble-outline', title: 'Chat Messages' },
  { icon: 'help-circle-outline', title: 'Help & Support' },
  { icon: 'information-circle-outline', title: 'About App' },
];

export function SellerAccountScreen() {
  const nav = useRootNavigation();
  return (
    <Screen>
      <Header title="Account" subtitle="Manage your profile and app settings" showBack={false} right={<IconButton name="settings-outline" accessibilityLabel="Settings" onPress={() => nav.navigate('Settings')} />} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}><Text style={styles.av}>RA</Text></View>
          <View style={styles.flex}>
            <Text style={typography.h3}>Ramesh Agarwal</Text>
            <Text style={typography.muted}>Individual Seller</Text>
            <Text style={typography.muted}>+91 98765 43210</Text>
          </View>
          <Tag label="Verified" tone="success" />
        </View>
      </Card>
      <Card style={styles.card}>
        <View style={styles.row}><Icon name="ribbon-outline" size={22} /><View style={styles.flex}><Text style={typography.h3}>Plan Limit</Text><Text style={typography.tiny}>You can list up to 10 properties</Text></View></View>
        <View style={styles.bar}><View style={styles.fill} /></View>
        <Text style={typography.tiny}>6 / 10 Properties Listed</Text>
      </Card>
      <SectionTitle title="My Listings" />
      <Card style={[styles.card, styles.noPad]}>
        {rows.map(r => <ListRow key={r.title} icon={r.icon} title={r.title} />)}
        <ListRow icon="log-out-outline" title="Logout" danger onPress={() => nav.reset({ index: 0, routes: [{ name: 'BuyerTabs' }] })} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
  noPad: { padding: 0 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  av: { color: colors.textInverse, fontWeight: '700' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.primarySoft },
  fill: { width: '60%', height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
