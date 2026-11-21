import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { EmptyState, Header, Screen } from '../../../components';
import { useAsync } from '../../../hooks/useAsync';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { recentlyViewedService } from '../../../services/recentlyViewedService';
import { colors } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { PropertyListCard } from '../components/PropertyListCard';

export function RecentlyViewedScreen() {
  const nav = useRootNavigation();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const { data, loading, error, reload } = useAsync(() => (signedIn ? recentlyViewedService.list() : Promise.resolve([])), [signedIn]);
  const list = data ?? [];

  function clearAll() {
    Alert.alert('Clear your history?', 'This removes the list; sellers keep their view counts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => recentlyViewedService.clear().then(reload).catch(() => Alert.alert('Could not clear', 'Try again.')) },
    ]);
  }

  return (
    <Screen>
      <Header
        title="Recently Viewed"
        subtitle="Properties you recently explored"
        right={signedIn && list.length > 0 ? <Text style={styles.clear} onPress={clearAll} accessibilityRole="button">Clear All</Text> : undefined}
      />
      {status === 'signedOut' ? <EmptyState title="Sign in to see your history" actionLabel="Sign In" onAction={() => nav.navigate('Login')} /> : null}
      {signedIn && error ? <EmptyState title="Could not load your history" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {signedIn && loading && !data ? <EmptyState title="Loading…" /> : null}
      {list.map(p => <PropertyListCard key={p.id} property={p} />)}
      {signedIn && !loading && !error && list.length === 0 ? <EmptyState title="Nothing here yet" body="Properties you open will appear here." /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clear: { color: colors.danger, fontWeight: '600', fontSize: 12 },
});
