import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, Screen, SectionTitle, StatTile } from '../../../components';
import { RootScreenProps } from '../../../navigation/types';
import { colors, typography } from '../../../theme';

const views = [30, 42, 38, 55, 48, 70, 62, 85, 78, 96];
const sources: [string, number][] = [['Property Search', 60], ['Direct / URL', 20], ['Social Media', 10], ['Others', 10]];

export function PropertyPerformanceScreen({ route }: RootScreenProps<'PropertyPerformance'>) {
  const max = Math.max(...views);
  return (
    <Screen footer={<View style={styles.row}><Button variant="outline" label="Edit Property" style={styles.flex} /><Button label="Promote" style={styles.flex} /></View>}>
      <Header title="Property Performance" subtitle={`Listing ${route.params.id.toUpperCase()} • Track views, leads and engagement`} />
      <Text style={styles.h}>Overview</Text>
      <View style={styles.stats}>
        <StatTile icon="eye-outline" value="1,245" label="Views" />
        <StatTile icon="people-outline" value="32" label="Leads" />
        <StatTile icon="chatbubble-outline" value="18" label="Inquiries" />
        <StatTile icon="heart-outline" value="27" label="Saves" />
      </View>
      <SectionTitle title="Views Over Time" />
      <Card style={styles.chart}>
        <View style={styles.bars}>
          {views.map((v, i) => <View key={i} style={[styles.bar, { height: (v / max) * 110 }]} />)}
        </View>
      </Card>
      <SectionTitle title="Traffic Source" />
      <Card style={styles.src}>
        {sources.map(([n, p]) => (
          <View key={n} style={styles.srcRow}>
            <Text style={[typography.muted, styles.label]}>{n}</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${p}%` }]} /></View>
            <Text style={typography.tiny}>{p}%</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  h: { ...typography.h3, paddingHorizontal: 16, marginBottom: 8 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  chart: { marginHorizontal: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  bar: { width: 18, borderRadius: 4, backgroundColor: colors.primary },
  src: { marginHorizontal: 16, gap: 10 },
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 100 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.primarySoft },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
