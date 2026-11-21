import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, Header, Icon, Screen } from '../../../components';
import { useAsync } from '../../../hooks/useAsync';
import { useRootNavigation } from '../../../navigation/useRootNavigation';
import { savedService } from '../../../services/savedService';
import { colors, typography } from '../../../theme';
import { useAuth } from '../../auth/AuthProvider';
import { PropertyListCard } from '../components/PropertyListCard';
import { useSavedProperties } from '../SavedPropertiesProvider';

export function SavedScreen() {
  const nav = useRootNavigation();
  const { status } = useAuth();
  const { ids } = useSavedProperties();
  const signedIn = status === 'signedIn';
  // Reload when a heart is toggled elsewhere (the ids change), so removed cards disappear.
  const { data, loading, error, reload } = useAsync(() => (signedIn ? savedService.list() : Promise.resolve([])), [signedIn, ids.length]);
  const saved = data ?? [];

  return (
    <Screen>
      <Header title="My Shortlist" subtitle="Properties you've saved for later" showBack={false} />
      {signedIn && saved.length > 0 ? (
        <View style={styles.banner}>
          <Icon name="heart" size={22} color={colors.danger} />
          <View style={styles.flex}>
            <Text style={typography.h3}>Easily compare your favorite properties</Text>
            <Text style={typography.tiny}>Review and shortlist the best options for you.</Text>
          </View>
          <Button small label={`Compare (${Math.min(saved.length, 4)})`} onPress={() => nav.navigate('Compare')} />
        </View>
      ) : null}
      {status === 'signedOut' ? <EmptyState title="Sign in to see your shortlist" body="Tap the heart on any property to save it." actionLabel="Sign In" onAction={() => nav.navigate('Login')} /> : null}
      {signedIn && error ? <EmptyState title="Could not load your shortlist" body={error.message} actionLabel="Retry" onAction={reload} /> : null}
      {signedIn && loading && !data ? <EmptyState title="Loading…" /> : null}
      {saved.map(p => <PropertyListCard key={p.id} property={p} showActions />)}
      {signedIn && !loading && !error && saved.length === 0 ? <EmptyState title="No saved properties yet" body="Tap the heart on any property to save it." /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 12, borderRadius: 12, backgroundColor: colors.primaryTint },
});
